import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";
import { DOWN_STATUSES } from "@/lib/status";
import type { EquipmentStatus, CauseCategory } from "@/generated/prisma/enums";

// Open a downtime event (any user, no approval routing — spec §2).
export async function POST(req: NextRequest) {
  const guard = guardMutation(req);
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as {
    equipmentId?: string;
    status?: EquipmentStatus;
    cause?: CauseCategory;
    notes?: string;
  } | null;
  if (!body?.equipmentId) return NextResponse.json({ error: "equipmentId required" }, { status: 400 });

  const status = body.status ?? "DOWN_REPORTED";
  if (!DOWN_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be a Down status" }, { status: 400 });
  }

  const equipment = await db.equipment.findUnique({
    where: { id: body.equipmentId },
    include: { events: { where: { closedAt: null } } },
  });
  if (!equipment) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  if (equipment.status === "RETIRED") {
    return NextResponse.json({ error: "Equipment is retired" }, { status: 409 });
  }
  if (equipment.events.length > 0) {
    return NextResponse.json({ error: "An open downtime event already exists" }, { status: 409 });
  }

  const event = await db.downtimeEvent.create({
    data: {
      equipmentId: equipment.id,
      status,
      cause: body.cause ?? "UNKNOWN_OTHER",
      notes: body.notes || null,
    },
  });
  await db.equipment.update({ where: { id: equipment.id }, data: { status } });

  await audit(guard.user.email, "downtime.opened", "DowntimeEvent", event.id, { equipmentStatus: equipment.status }, {
    equipmentId: equipment.id,
    itemId: equipment.itemId,
    status,
    cause: event.cause,
    notes: event.notes,
  });

  return NextResponse.json({ ok: true, event: { ...event, repairCost: null } });
}
