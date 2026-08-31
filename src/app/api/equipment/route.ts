import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";
import type { BuildingLevel, IconCategory } from "@/generated/prisma/enums";

const LEVELS: BuildingLevel[] = ["ENTRY", "BALCONY", "LOWER_2"];

// Default pin position per level: center of that level's fitness zone. Every
// new item used to land on this exact point — fine for the first item on a
// level, but the second one dropped on the same coordinates as the first,
// invisibly. In arrange mode a raycast only ever resolves a click to
// whichever pin is nearest the camera, so the one underneath became
// permanently unreachable — it could never be selected or dragged, with no
// other UI (list view, coordinate field, etc.) to move or even find it. New
// items are now nudged along a small spiral so each one starts at a
// distinct spot, still centered on the same zone.
const LEVEL_DEFAULT_POS: Record<BuildingLevel, { x: number; y: number }> = {
  ENTRY: { x: 0.33, y: 0.59 },
  BALCONY: { x: 0.31, y: 0.5 },
  LOWER_2: { x: 0.486, y: 0.41 },
};

const SPIRAL_STEP = 0.012; // ~1.2% of the floor image; visibly distinct, still on-zone

function spiralOffset(index: number): { dx: number; dy: number } {
  if (index === 0) return { dx: 0, dy: 0 };
  const angle = index * 2.4; // golden-angle-ish spread so pins fan out, not grid-lock
  const r = SPIRAL_STEP * Math.sqrt(index);
  return { dx: r * Math.cos(angle), dy: r * Math.sin(angle) };
}

// Two pins closer together than this on the same level read as stacked in 3D.
// Comfortably below the spiral's own ~SPIRAL_STEP neighbour spacing, so
// consecutive slots never reject each other.
const MIN_SEPARATION = SPIRAL_STEP / 2;

// Walk the spiral outward from the zone center and take the first slot that
// isn't already occupied. Indexing off a plain count instead would go wrong
// as soon as an item is deleted (DELETE /api/equipment/[id] is reachable from
// the edit form): the count drops, the next add reuses an index that a
// surviving item still sits on, and the pins stack again — the exact bug this
// spiral exists to prevent. Checking real positions is also correct for items
// that have since been dragged somewhere else.
function firstFreeSlot(
  base: { x: number; y: number },
  taken: { mapX: number | null; mapY: number | null }[],
): { x: number; y: number } {
  // mapX/mapY are nullable; an item without a position isn't on the map and
  // can't be collided with, so it doesn't occupy a slot.
  const placed = taken.filter(
    (t): t is { mapX: number; mapY: number } => t.mapX !== null && t.mapY !== null,
  );
  for (let i = 0; i < 512; i++) {
    const { dx, dy } = spiralOffset(i);
    const x = base.x + dx;
    const y = base.y + dy;
    if (!placed.some((t) => Math.hypot(t.mapX - x, t.mapY - y) < MIN_SEPARATION)) return { x, y };
  }
  return { x: base.x, y: base.y };
}

export async function POST(req: NextRequest) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as {
    itemId?: string;
    name?: string;
    brand?: string;
    model?: string;
    serial?: string;
    level?: BuildingLevel;
    zone?: string;
    iconCategory?: IconCategory;
    vendor?: string;
    purchaseDate?: string;
    cost?: number | string;
    warrantyMonths?: number | string;
    warrantyExpiresAt?: string;
    manualUrl?: string;
    notes?: string;
  } | null;

  const itemId = body?.itemId?.trim();
  const name = body?.name?.trim();
  const brand = body?.brand?.trim();
  const zone = body?.zone?.trim();
  if (!itemId || !name || !brand || !body?.level || !zone) {
    return NextResponse.json({ error: "Item ID, name, brand, level, and zone are required" }, { status: 400 });
  }
  if (!LEVELS.includes(body.level)) {
    return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  }
  const clash = await db.equipment.findUnique({ where: { itemId } });
  if (clash) {
    return NextResponse.json({ error: `Item ID ${itemId} is already in use by "${clash.name}"` }, { status: 409 });
  }

  const existingOnLevel = await db.equipment.findMany({
    where: { level: body.level },
    select: { mapX: true, mapY: true },
  });
  const pos = firstFreeSlot(LEVEL_DEFAULT_POS[body.level], existingOnLevel);
  const equipment = await db.equipment.create({
    data: {
      itemId,
      name,
      rawItemName: name,
      brand,
      model: body.model?.trim() || null,
      serial: body.serial?.trim() || null,
      level: body.level,
      zone,
      mapX: pos.x,
      mapY: pos.y,
      iconCategory: body.iconCategory ?? "SPECIALTY",
      vendor: body.vendor?.trim() || null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      cost: body.cost === undefined || body.cost === "" ? null : Number(body.cost),
      warrantyMonths: body.warrantyMonths === undefined || body.warrantyMonths === "" ? null : Number(body.warrantyMonths),
      warrantyExpiresAt: body.warrantyExpiresAt ? new Date(body.warrantyExpiresAt) : null,
      manualUrl: body.manualUrl?.trim() || null,
      manualMatch: "UNREVIEWED",
      notes: body.notes?.trim() || null,
    },
  });

  await audit(guard.user.email, "equipment.created", "Equipment", equipment.id, undefined, {
    itemId, name, brand, level: body.level, zone,
  });
  return NextResponse.json({ ok: true, id: equipment.id });
}
