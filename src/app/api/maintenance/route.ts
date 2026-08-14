import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";

// Routine maintenance — tracked separately from downtime (spec §4/§7).
export async function POST(req: NextRequest) {
  const guard = guardMutation(req);
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as {
    equipmentId?: string;
    date?: string;
    notes?: string;
    cost?: number | string | null;
  } | null;
  if (!body?.equipmentId || !body.notes?.trim()) {
    return NextResponse.json({ error: "equipmentId and notes are required" }, { status: 400 });
  }
  const equipment = await db.equipment.findUnique({ where: { id: body.equipmentId } });
  if (!equipment) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });

  const cost = body.cost === null || body.cost === undefined || body.cost === "" ? null : Number(body.cost);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
    return NextResponse.json({ error: "Invalid cost" }, { status: 400 });
  }

  const record = await db.maintenanceRecord.create({
    data: {
      equipmentId: equipment.id,
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes.trim(),
      cost,
    },
  });
  await audit(guard.user.email, "maintenance.logged", "MaintenanceRecord", record.id, undefined, {
    equipmentId: equipment.id,
    itemId: equipment.itemId,
    date: record.date,
    cost,
  });
  return NextResponse.json({ ok: true, record: { ...record, cost: record.cost?.toString() ?? null } });
}
