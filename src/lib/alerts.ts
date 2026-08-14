import { db } from "./db";
import { trailing12mFlag } from "./metrics";
import { makeEmailProvider, recipientEmails } from "./notify";

const DAY = 86_400_000;
export const WARRANTY_STAGES = [90, 60, 30] as const;

export interface WarrantyAlert {
  equipmentId: string;
  itemId: string;
  name: string;
  brand: string;
  expiresAt: Date;
  daysLeft: number;
  stage: 30 | 60 | 90 | 0; // 0 = expired
}

export async function warrantyAlerts(): Promise<WarrantyAlert[]> {
  const now = Date.now();
  const soon = new Date(now + 90 * DAY);
  const list = await db.equipment.findMany({
    where: { warrantyExpiresAt: { not: null, lte: soon }, status: { not: "RETIRED" } },
    select: { id: true, itemId: true, name: true, brand: true, warrantyExpiresAt: true },
  });
  return list
    .map((e) => {
      const daysLeft = Math.ceil((e.warrantyExpiresAt!.getTime() - now) / DAY);
      const stage = daysLeft <= 0 ? 0 : daysLeft <= 30 ? 30 : daysLeft <= 60 ? 60 : 90;
      return {
        equipmentId: e.id,
        itemId: e.itemId,
        name: e.name,
        brand: e.brand,
        expiresAt: e.warrantyExpiresAt!,
        daysLeft,
        stage: stage as WarrantyAlert["stage"],
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export interface DowntimeFlag {
  equipmentId: string;
  itemId: string;
  name: string;
  pct: number;
}

export async function downtimeFlags(): Promise<DowntimeFlag[]> {
  const [equipment, events] = await Promise.all([
    db.equipment.findMany({
      where: { status: { not: "RETIRED" } },
      select: { id: true, itemId: true, name: true },
    }),
    db.downtimeEvent.findMany({ select: { equipmentId: true, openedAt: true, closedAt: true, repairCost: true } }),
  ]);
  const byEq = new Map<string, typeof events>();
  for (const ev of events) byEq.set(ev.equipmentId, [...(byEq.get(ev.equipmentId) ?? []), ev]);
  return equipment
    .map((e) => ({ e, flag: trailing12mFlag(byEq.get(e.id) ?? []) }))
    .filter((x) => x.flag.flagged)
    .map((x) => ({ equipmentId: x.e.id, itemId: x.e.itemId, name: x.e.name, pct: x.flag.pct }))
    .sort((a, b) => b.pct - a.pct);
}

// Daily alert run: emails (via provider stub) for newly relevant warranty
// stages and 5% downtime flags. Dedupe: skips an alert if an identical one
// was recorded in the audit log within the stage window.
export async function runAlerts(): Promise<{ warrantySent: number; flagsSent: number }> {
  const provider = makeEmailProvider();
  const to = await recipientEmails();
  let warrantySent = 0;
  let flagsSent = 0;

  const wAlerts = (await warrantyAlerts()).filter((a) => a.stage !== 0);
  for (const a of wAlerts) {
    const dupe = await db.auditLog.findFirst({
      where: {
        action: "alert.warranty",
        targetId: a.equipmentId,
        createdAt: { gte: new Date(Date.now() - 25 * DAY) },
      },
    });
    if (dupe) continue;
    await provider.send({
      to,
      subject: `[SRC] Warranty expires in ${a.daysLeft} days — ${a.name} (#${a.itemId})`,
      text: `${a.brand} ${a.name} (#${a.itemId}) warranty expires ${a.expiresAt.toLocaleDateString()} (${a.daysLeft} days). Stage: ${a.stage}-day notice.`,
    });
    await db.auditLog.create({
      data: {
        actorEmail: "system",
        action: "alert.warranty",
        targetType: "Equipment",
        targetId: a.equipmentId,
        after: { stage: a.stage, daysLeft: a.daysLeft },
      },
    });
    warrantySent++;
  }

  const flags = await downtimeFlags();
  for (const f of flags) {
    const dupe = await db.auditLog.findFirst({
      where: {
        action: "alert.downtime_flag",
        targetId: f.equipmentId,
        createdAt: { gte: new Date(Date.now() - 25 * DAY) },
      },
    });
    if (dupe) continue;
    await provider.send({
      to,
      subject: `[SRC] Replacement review — ${f.name} (#${f.itemId}) at ${f.pct.toFixed(1)}% downtime`,
      text: `${f.name} (#${f.itemId}) crossed the 5% downtime threshold on a trailing 12-month basis: ${f.pct.toFixed(2)}%. Flagged for replacement review.`,
    });
    await db.auditLog.create({
      data: {
        actorEmail: "system",
        action: "alert.downtime_flag",
        targetType: "Equipment",
        targetId: f.equipmentId,
        after: { pct: f.pct },
      },
    });
    flagsSent++;
  }

  return { warrantySent, flagsSent };
}
