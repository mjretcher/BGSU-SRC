import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";
import { DOWN_STATUSES } from "@/lib/status";
import { parseBody, openDowntimeSchema } from "@/lib/validation";

// Open a downtime event (any user, no approval routing — spec §2). When
// `closedAt` is supplied, the event is created already resolved in one shot
// — the "staff fixed it in 5/20 minutes, no parts ordered" quick-log path —
// and equipment status never leaves IN_SERVICE. Without it, this behaves as
// before: opens a live event and puts the equipment into the given down
// status.
export async function POST(req: NextRequest) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const parsed = await parseBody(req, openDowntimeSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const status = body.status ?? "DOWN_REPORTED";
  if (!DOWN_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be a Down status" }, { status: 400 });
  }

  // A closed-on-arrival event is the quick-log path. openedAt defaults to now
  // only when a closedAt was given without one; the schema has already checked
  // that closedAt is later when both are present.
  const closedAt = body.closedAt ?? undefined;
  const openedAt = closedAt ? (body.openedAt ?? new Date()) : (body.openedAt ?? undefined);
  if (closedAt && openedAt && closedAt <= openedAt) {
    return NextResponse.json({ error: "closedAt must be after openedAt" }, { status: 400 });
  }
  const repairCost = body.repairCost;

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

  // The check above is a read, and this is a write, so two concurrent reports on
  // the same machine can both get past it. A partial unique index
  // (equipmentId WHERE closedAt IS NULL) is what actually makes "one open event"
  // true; catching its violation turns the loser of the race into the same 409
  // the check would have produced. A quick log is created already closed, so it
  // is outside the index and never conflicts.
  let event;
  try {
    event = await db.downtimeEvent.create({
      data: {
        equipmentId: equipment.id,
        status,
        cause: body.cause ?? "UNKNOWN_OTHER",
        notes: body.notes || null,
        ...(openedAt ? { openedAt } : {}),
        ...(closedAt ? { closedAt, repairCost } : {}),
      },
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "An open downtime event already exists" }, { status: 409 });
    }
    throw err;
  }
  // A quick-logged (already-closed) event never moves the equipment off
  // IN_SERVICE; a live-opened one takes on the reported down status.
  if (!closedAt) {
    await db.equipment.update({ where: { id: equipment.id }, data: { status } });
  }

  await audit(guard.user.email, closedAt ? "downtime.quick_logged" : "downtime.opened", "DowntimeEvent", event.id, { equipmentStatus: equipment.status }, {
    equipmentId: equipment.id,
    itemId: equipment.itemId,
    status,
    cause: event.cause,
    notes: event.notes,
    openedAt: event.openedAt,
    closedAt: event.closedAt,
  });

  return NextResponse.json({
    ok: true,
    event: { ...event, repairCost: event.repairCost?.toString() ?? null },
  });
}
