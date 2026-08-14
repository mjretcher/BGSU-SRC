// Photo-informed pin layout: machines cluster by category in rows, matching
// how the SRC actually arranges the floor (free weights together near the
// balcony overhang, selectorized machines in rows toward the window wall,
// cardio in tight parallel rows by type, functional studio along its walls).
// Pins that a user has manually moved (equipment.pin_moved in the audit log)
// are left exactly where they were put.
// Usage: npx tsx scripts/relayout-pins.ts
import "dotenv/config";
import { db } from "../src/lib/db";
import type { IconCategory, BuildingLevel } from "../src/generated/prisma/enums";

interface Rect { x0: number; x1: number; y0: number; y1: number }

// Normalized against the 3840x1911 floor-plan image space (same as mapX/mapY).
const ENTRY_FREEWEIGHT: Rect = { x0: 0.246, x1: 0.296, y0: 0.524, y1: 0.654 }; // left patch
const ENTRY_MACHINES: Rect = { x0: 0.319, x1: 0.417, y0: 0.524, y1: 0.672 }; // right patch
const BALCONY_CARDIO: Rect = { x0: 0.227, x1: 0.389, y0: 0.449, y1: 0.549 };
const LOWER2_FUNCTIONAL: Rect = { x0: 0.459, x1: 0.512, y0: 0.352, y1: 0.462 };
const LOWER2_PT: Rect = { x0: 0.466, x1: 0.506, y0: 0.352, y1: 0.396 };

const FREEWEIGHT: IconCategory[] = ["RACK_SMITH", "BENCH", "DUMBBELL_RACK"];

// Category display order = row order on the floor, per the photos.
const ENTRY_FREEWEIGHT_ORDER: IconCategory[] = ["RACK_SMITH", "BENCH", "DUMBBELL_RACK"];
const ENTRY_MACHINE_ORDER: IconCategory[] = [
  "SELECTORIZED_UPPER", "LEG_MACHINE", "CABLE_PULLEY", "ROWER_SKI",
  "FUNCTIONAL_TOOL", "STAIR_CLIMBER", "BIKE", "TREADMILL", "SPECIALTY",
  "ELLIPTICAL", "ARC_TRAINER", "CURVED_TREADMILL", "BENCH", "RACK_SMITH", "DUMBBELL_RACK",
];
const CARDIO_ORDER: IconCategory[] = [
  "TREADMILL", "CURVED_TREADMILL", "ELLIPTICAL", "ARC_TRAINER", "BIKE",
  "STAIR_CLIMBER", "ROWER_SKI", "SELECTORIZED_UPPER", "LEG_MACHINE",
  "CABLE_PULLEY", "DUMBBELL_RACK", "BENCH", "RACK_SMITH", "FUNCTIONAL_TOOL", "SPECIALTY",
];

interface Item { id: string; iconCategory: IconCategory; name: string }

// Category-sorted grid: each category starts a new row; rows share the rect.
function rowLayout(items: Item[], order: IconCategory[], rect: Rect, cols: number): Map<string, { x: number; y: number }> {
  const sorted = [...items].sort((a, b) => {
    const oa = order.indexOf(a.iconCategory);
    const ob = order.indexOf(b.iconCategory);
    return (oa === -1 ? 99 : oa) - (ob === -1 ? 99 : ob) || a.name.localeCompare(b.name);
  });
  // count total rows: per category, ceil(count/cols)
  const byCat = new Map<IconCategory, Item[]>();
  for (const it of sorted) byCat.set(it.iconCategory, [...(byCat.get(it.iconCategory) ?? []), it]);
  const cats = [...byCat.keys()];
  const totalRows = cats.reduce((acc, c) => acc + Math.ceil(byCat.get(c)!.length / cols), 0);
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const rowH = h / Math.max(totalRows, 1);

  const out = new Map<string, { x: number; y: number }>();
  let row = 0;
  for (const c of cats) {
    const members = byCat.get(c)!;
    for (let i = 0; i < members.length; i++) {
      const col = i % cols;
      if (i > 0 && col === 0) row++;
      const rowCount = Math.min(cols, members.length - Math.floor(i / cols) * cols);
      // center the (possibly short) row horizontally
      const x = rect.x0 + ((col + 0.5) / cols) * w + ((cols - rowCount) / (2 * cols)) * w;
      const y = rect.y0 + (row + 0.5) * rowH;
      out.set(members[i].id, { x, y });
    }
    row++;
  }
  return out;
}

// Along-the-walls layout for the functional studio (photo: gear lines both walls).
function wallLayout(items: Item[], rect: Rect): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const half = Math.ceil(items.length / 2);
  const top = items.slice(0, half);
  const bottom = items.slice(half);
  top.forEach((it, i) => {
    out.set(it.id, { x: rect.x0 + ((i + 0.5) / Math.max(top.length, 1)) * (rect.x1 - rect.x0), y: rect.y0 + 0.012 });
  });
  bottom.forEach((it, i) => {
    out.set(it.id, { x: rect.x0 + ((i + 0.5) / Math.max(bottom.length, 1)) * (rect.x1 - rect.x0), y: rect.y1 - 0.012 });
  });
  return out;
}

async function main() {
  const [equipment, movedLogs] = await Promise.all([
    db.equipment.findMany({ select: { id: true, name: true, iconCategory: true, level: true, zone: true } }),
    db.auditLog.findMany({
      where: { action: "equipment.pin_moved", actorEmail: { not: "system" } },
      select: { targetId: true },
    }),
  ]);
  const manuallyMoved = new Set(movedLogs.map((l) => l.targetId).filter(Boolean));

  const positions = new Map<string, { x: number; y: number }>();

  const entry = equipment.filter((e) => e.level === "ENTRY");
  const entryFree = entry.filter((e) => FREEWEIGHT.includes(e.iconCategory));
  const entryMachines = entry.filter((e) => !FREEWEIGHT.includes(e.iconCategory));
  for (const [k, v] of rowLayout(entryFree, ENTRY_FREEWEIGHT_ORDER, ENTRY_FREEWEIGHT, 7)) positions.set(k, v);
  for (const [k, v] of rowLayout(entryMachines, ENTRY_MACHINE_ORDER, ENTRY_MACHINES, 10)) positions.set(k, v);

  const balcony = equipment.filter((e) => e.level === "BALCONY");
  for (const [k, v] of rowLayout(balcony, CARDIO_ORDER, BALCONY_CARDIO, 14)) positions.set(k, v);

  const lower = equipment.filter((e) => e.level === "LOWER_2");
  const functional = lower.filter((e) => e.zone === "Functional Training Room");
  const pt = lower.filter((e) => e.zone !== "Functional Training Room");
  for (const [k, v] of wallLayout(functional, LOWER2_FUNCTIONAL)) positions.set(k, v);
  pt.forEach((e, i) => {
    positions.set(e.id, {
      x: LOWER2_PT.x0 + ((i + 0.5) / Math.max(pt.length, 1)) * (LOWER2_PT.x1 - LOWER2_PT.x0),
      y: (LOWER2_PT.y0 + LOWER2_PT.y1) / 2,
    });
  });

  let updated = 0;
  let skipped = 0;
  for (const e of equipment) {
    if (manuallyMoved.has(e.id)) {
      skipped++;
      continue;
    }
    const p = positions.get(e.id);
    if (!p) continue;
    await db.equipment.update({ where: { id: e.id }, data: { mapX: p.x, mapY: p.y } });
    updated++;
  }
  await db.auditLog.create({
    data: {
      actorEmail: "system",
      action: "equipment.bulk_relayout",
      targetType: "Equipment",
      after: { updated, skippedManuallyMoved: skipped, basis: "photo-informed category rows" },
    },
  });
  console.log(`Repositioned ${updated} pins; left ${skipped} manually-placed pins untouched.`);
}

main().then(() => process.exit(0));
