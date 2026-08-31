import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, sessionFrom, audit } from "@/lib/api";
import { computeMetrics, trailing12mFlag, periodRange } from "@/lib/metrics";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await sessionFrom(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const equipment = await db.equipment.findUnique({
    where: { id },
    include: {
      events: { orderBy: { openedAt: "desc" } },
      maintenance: { orderBy: { date: "desc" }, take: 10 },
    },
  });
  if (!equipment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { start, end } = periodRange("year");
  const metrics = computeMetrics(equipment.events, start, end);
  const flag = trailing12mFlag(equipment.events);
  const lifetimeCost = equipment.events.reduce((a, e) => a + Number(e.repairCost ?? 0), 0);

  return NextResponse.json({
    equipment: {
      ...equipment,
      cost: equipment.cost?.toString() ?? null,
      events: equipment.events.slice(0, 10).map((e) => ({ ...e, repairCost: e.repairCost?.toString() ?? null })),
      maintenance: equipment.maintenance.map((m) => ({ ...m, cost: m.cost?.toString() ?? null })),
    },
    metrics: { ...metrics, flag, lifetimeCost },
  });
}

const EDITABLE = [
  "name", "brand", "model", "modelNote", "serial", "vendor", "notes",
  "manualUrl", "manualPdfUrl", "manualMatch", "manualComment",
  "purchaseDate", "cost", "warrantyMonths", "warrantyExpiresAt",
  "mapX", "mapY", "iconCategory", "level", "zone",
] as const;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.equipment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (!(key in body)) continue;
    let v = body[key];
    if ((key === "purchaseDate" || key === "warrantyExpiresAt") && typeof v === "string") v = new Date(v);
    data[key] = v;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No editable fields" }, { status: 400 });

  const before: Record<string, unknown> = {};
  for (const k of Object.keys(data)) before[k] = existing[k as keyof typeof existing];

  const updated = await db.equipment.update({ where: { id }, data });
  const isPinMove = Object.keys(data).every((k) => k === "mapX" || k === "mapY");
  await audit(guard.user.email, isPinMove ? "equipment.pin_moved" : "equipment.updated", "Equipment", id, before, data);

  return NextResponse.json({ ok: true, equipment: { ...updated, cost: updated.cost?.toString() ?? null } });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const equipment = await db.equipment.findUnique({
    where: { id },
    include: { _count: { select: { events: true, maintenance: true } } },
  });
  if (!equipment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Full snapshot into the audit log — deleting cascades events/maintenance,
  // so this entry is the surviving historical record.
  await audit(guard.user.email, "equipment.deleted", "Equipment", id, {
    itemId: equipment.itemId,
    name: equipment.name,
    brand: equipment.brand,
    model: equipment.model,
    serial: equipment.serial,
    level: equipment.level,
    zone: equipment.zone,
    status: equipment.status,
    events: equipment._count.events,
    maintenance: equipment._count.maintenance,
  });
  await db.equipment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
