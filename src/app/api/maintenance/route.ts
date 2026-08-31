import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";
import { parseBody, createMaintenanceSchema } from "@/lib/validation";

// Routine maintenance — tracked separately from downtime (spec §4/§7).
export async function POST(req: NextRequest) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const parsed = await parseBody(req, createMaintenanceSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const equipment = await db.equipment.findUnique({ where: { id: body.equipmentId } });
  if (!equipment) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });

  const cost = body.cost;

  const record = await db.maintenanceRecord.create({
    data: {
      equipmentId: equipment.id,
      date: body.date ?? new Date(),
      notes: body.notes,
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
