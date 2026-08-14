import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";
import type { BuildingLevel, IconCategory } from "@/generated/prisma/enums";

const LEVELS: BuildingLevel[] = ["ENTRY", "BALCONY", "LOWER_2"];

// Default pin position per level: center of that level's fitness zone.
const LEVEL_DEFAULT_POS: Record<BuildingLevel, { x: number; y: number }> = {
  ENTRY: { x: 0.33, y: 0.59 },
  BALCONY: { x: 0.31, y: 0.5 },
  LOWER_2: { x: 0.486, y: 0.41 },
};

export async function POST(req: NextRequest) {
  const guard = guardMutation(req);
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

  const pos = LEVEL_DEFAULT_POS[body.level];
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
