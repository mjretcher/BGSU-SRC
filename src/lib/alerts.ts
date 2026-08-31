import { db } from "./db";
import { trailing12mFlag, groupBy, overlappingPeriod } from "./metrics";
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
  const now = new Date();
  const flagStart = new Date(now);
  flagStart.setFullYear(flagStart.getFullYear() - 1);

  const [equipment, events] = await Promise.all([
    db.equipment.findMany({
      where: { status: { not: "RETIRED" } },
      select: { id: true, itemId: true, name: true },
    }),
    db.downtimeEvent.findMany({
      // Trailing 12 months is the whole basis of this flag; fetching the entire
      // event history to compute it got slower every month.
      where: overlappingPeriod(flagStart, now),
      select: { equipmentId: true, openedAt: true, closedAt: true, repairCost: true },
    }),
  ]);
  const byEq = groupBy(events, (ev) => ev.equipmentId);
  return equipment
    .map((e) => ({ e, flag: trailing12mFlag(byEq.get(e.id) ?? [], 5, now) }))
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

  // Dedupe used to run one findFirst per candidate alert, inside each loop.
  // The whole window is one query: alerts already sent are a small set keyed by
  // action and target. Entries are added as this run sends, so a repeat inside
  // a single run is caught too.
  const since = new Date(Date.now() - 25 * DAY);
  const recentAlerts = await db.auditLog.findMany({
    where: {
      action: { in: ["alert.warranty", "alert.downtime_flag"] },
      createdAt: { gte: since },
      targetId: { not: null },
    },
    select: { action: true, targetId: true },
  });
  const alreadySent = new Set(recentAlerts.map((a) => `${a.action}:${a.targetId}`));

  const wAlerts = (await warrantyAlerts()).filter((a) => a.stage !== 0);
  for (const a of wAlerts) {
    if (alreadySent.has(`alert.warranty:${a.equipmentId}`)) continue;
    alreadySent.add(`alert.warranty:${a.equipmentId}`);
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
    if (alreadySent.has(`alert.downtime_flag:${f.equipmentId}`)) continue;
    alreadySent.add(`alert.downtime_flag:${f.equipmentId}`);
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
