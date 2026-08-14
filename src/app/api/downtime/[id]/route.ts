import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";
import { DOWN_STATUSES } from "@/lib/status";
import type { EquipmentStatus, CauseCategory } from "@/generated/prisma/enums";

// Update an open downtime event: change substatus, cause, notes, or close it
// (optionally with a repair cost). Closing returns the machine to service.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = guardMutation(req);
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    status?: EquipmentStatus;
    cause?: CauseCategory;
    notes?: string;
    close?: boolean;
    repairCost?: number | string | null;
    retire?: boolean;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const event = await db.downtimeEvent.findUnique({ where: { id }, include: { equipment: true } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.closedAt) return NextResponse.json({ error: "Event already closed" }, { status: 409 });

  const before = { status: event.status, cause: event.cause, notes: event.notes, equipmentStatus: event.equipment.status };

  if (body.close) {
    const repairCost =
      body.repairCost === null || body.repairCost === undefined || body.repairCost === ""
        ? null
        : Number(body.repairCost);
    if (repairCost !== null && (!Number.isFinite(repairCost) || repairCost < 0)) {
      return NextResponse.json({ error: "Invalid repair cost" }, { status: 400 });
    }
    const nextEquipmentStatus: EquipmentStatus = body.retire ? "RETIRED" : "IN_SERVICE";
    const updated = await db.downtimeEvent.update({
      where: { id },
      data: {
        closedAt: new Date(),
        repairCost,
        notes: body.notes !== undefined ? body.notes || null : undefined,
      },
    });
    await db.equipment.update({
      where: { id: event.equipmentId },
      data: { status: nextEquipmentStatus, retiredAt: body.retire ? new Date() : undefined },
    });
    await audit(guard.user.email, body.retire ? "downtime.closed_retired" : "downtime.closed", "DowntimeEvent", id, before, {
      repairCost,
      equipmentStatus: nextEquipmentStatus,
    });
    return NextResponse.json({ ok: true, event: { ...updated, repairCost: updated.repairCost?.toString() ?? null } });
  }

  const data: { status?: EquipmentStatus; cause?: CauseCategory; notes?: string | null } = {};
  if (body.status) {
    if (!DOWN_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "status must be a Down status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.cause) data.cause = body.cause;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await db.downtimeEvent.update({ where: { id }, data });
  if (data.status) {
    await db.equipment.update({ where: { id: event.equipmentId }, data: { status: data.status } });
  }
  await audit(guard.user.email, "downtime.status_changed", "DowntimeEvent", id, before, data);
  return NextResponse.json({ ok: true, event: { ...updated, repairCost: updated.repairCost?.toString() ?? null } });
}
