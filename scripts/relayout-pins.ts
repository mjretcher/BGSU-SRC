// Footprint-aware, photo-informed pin layout (v2).
// Rows are spaced by each category's actual plan footprint (GLYPH_SIZE), run
// at the building's row angle, and follow the real floor arrangement:
//  - Entry: free weights west (racks vs. the mirror wall, then benches, then
//    dumbbell racks), selectorized/leg/cable rows east toward the windows.
//  - Balcony: climbers/rowers nearest the track, then bikes, then ellipticals,
//    with the treadmill row along the mezzanine rail overlooking the floor.
//  - Lower II: functional gear along the studio's two 45-degree walls.
// Pins manually moved by a user (equipment.pin_moved) are never touched.
// Usage: npx tsx scripts/relayout-pins.ts
import "dotenv/config";
import { db } from "../src/lib/db";
import { GLYPH_SIZE } from "../src/components/map/EquipmentGlyphs";
import type { IconCategory } from "../src/generated/prisma/enums";

const W = 3840;
const H = 1911;

interface RegionPlan {
  x0: number; x1: number; y0: number; y1: number; // image px
  tiltDeg: number;
  order: IconCategory[][]; // groups laid top→bottom; categories in a group share rows
}

const ENTRY_FREE: RegionPlan = {
  x0: 940, x1: 1215, y0: 960, y1: 1290, tiltDeg: -10,
  order: [["RACK_SMITH"], ["BENCH"], ["DUMBBELL_RACK"]],
};
const ENTRY_MACHINES: RegionPlan = {
  x0: 1250, x1: 1660, y0: 960, y1: 1310, tiltDeg: -10,
  order: [
    ["SELECTORIZED_UPPER"],
    ["LEG_MACHINE"],
    ["CABLE_PULLEY", "FUNCTIONAL_TOOL"],
    // Note: RACK_SMITH / BENCH / DUMBBELL_RACK are deliberately absent here —
    // they're the ENTRY_FREE set and already filtered out of `entry` before
    // this plan runs (see the `FREE.includes` filter below), so listing them
    // in this group was dead weight that could never match anything.
    ["ROWER_SKI", "STAIR_CLIMBER", "BIKE", "TREADMILL", "ELLIPTICAL", "ARC_TRAINER", "CURVED_TREADMILL", "SPECIALTY"],
  ],
};
// Bottom group renders last = closest to the mezzanine rail (photo: treadmills
// stand at the rail overlooking the weight floor).
const BALCONY: RegionPlan = {
  x0: 880, x1: 1490, y0: 862, y1: 1044, tiltDeg: 0,
  order: [
    ["STAIR_CLIMBER", "ROWER_SKI", "SPECIALTY", "FUNCTIONAL_TOOL", "SELECTORIZED_UPPER", "LEG_MACHINE", "CABLE_PULLEY", "DUMBBELL_RACK", "BENCH", "RACK_SMITH"],
    ["BIKE"],
    ["ELLIPTICAL", "ARC_TRAINER"],
    ["TREADMILL", "CURVED_TREADMILL"],
  ],
};

interface Item { id: string; iconCategory: IconCategory; name: string }

function layoutRegion(items: Item[], plan: RegionPlan): Map<string, { x: number; y: number }> {
  const width = plan.x1 - plan.x0;
  const cx = (plan.x0 + plan.x1) / 2;
  const tan = Math.tan((plan.tiltDeg * Math.PI) / 180);

  // build rows: each row = { y-advance, [{item, x}] }
  interface Row { h: number; xs: { item: Item; x: number }[] }
  const rows: Row[] = [];
  for (const group of plan.order) {
    const members = items
      .filter((it) => group.includes(it.iconCategory))
      .sort((a, b) => group.indexOf(a.iconCategory) - group.indexOf(b.iconCategory) || a.name.localeCompare(b.name));
    if (!members.length) continue;
    // rows within the group are spaced by the tallest footprint in the group
    const maxH = Math.max(...members.map((m) => GLYPH_SIZE[m.iconCategory].h));
    const rowSp = maxH * 1.15;
    let i = 0;
    while (i < members.length) {
      // fill one row greedily by each member's own width
      const rowItems: { item: Item; x: number }[] = [];
      let used = 0;
      while (i < members.length) {
        const gw = GLYPH_SIZE[members[i].iconCategory].w * 1.38;
        if (used + gw > width && rowItems.length > 0) break;
        rowItems.push({ item: members[i], x: used + gw / 2 });
        used += gw;
        i++;
      }
      // center the row
      for (const r of rowItems) r.x = plan.x0 + r.x + (width - used) / 2;
      rows.push({ h: rowSp, xs: rowItems });
    }
  }

  // vertical fit: scale row heights into the region if they overflow
  const total = rows.reduce((a, r) => a + r.h, 0);
  const fit = Math.min(1, (plan.y1 - plan.y0) / Math.max(total, 1));
  const out = new Map<string, { x: number; y: number }>();
  let y = plan.y0;
  for (const row of rows) {
    const rowY = y + (row.h * fit) / 2;
    for (const { item, x } of row.xs) {
      out.set(item.id, { x: x / W, y: (rowY + tan * (x - cx)) / H });
    }
    y += row.h * fit;
  }
  return out;
}

// Functional studio: gear along the two 45° walls (photo: racks line both sides).
function studioWalls(items: Item[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const nw = { x0: 1790, y0: 762, x1: 1886, y1: 668 }; // inner NW wall line
  const se = { x0: 1806, y0: 874, x1: 1914, y1: 768 }; // inner SE wall line
  const half = Math.ceil(items.length / 2);
  const place = (line: typeof nw, list: Item[]) => {
    list.forEach((it, i) => {
      const t = (i + 0.5) / Math.max(list.length, 1);
      out.set(it.id, {
        x: (line.x0 + t * (line.x1 - line.x0)) / W,
        y: (line.y0 + t * (line.y1 - line.y0)) / H,
      });
    });
  };
  place(nw, items.slice(0, half));
  place(se, items.slice(half));
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
  const manuallyMoved = process.env.ALL === "1" ? new Set<string>() : new Set(movedLogs.map((l) => l.targetId).filter(Boolean));
  const FREE: IconCategory[] = ["RACK_SMITH", "BENCH", "DUMBBELL_RACK"];

  const positions = new Map<string, { x: number; y: number }>();
  const entry = equipment.filter((e) => e.level === "ENTRY");
  for (const [k, v] of layoutRegion(entry.filter((e) => FREE.includes(e.iconCategory)), ENTRY_FREE)) positions.set(k, v);
  for (const [k, v] of layoutRegion(entry.filter((e) => !FREE.includes(e.iconCategory)), ENTRY_MACHINES)) positions.set(k, v);
  for (const [k, v] of layoutRegion(equipment.filter((e) => e.level === "BALCONY"), BALCONY)) positions.set(k, v);

  const lower = equipment.filter((e) => e.level === "LOWER_2");
  const functional = lower.filter((e) => e.zone === "Functional Training Room");
  const pt = lower.filter((e) => e.zone !== "Functional Training Room");
  for (const [k, v] of studioWalls(functional)) positions.set(k, v);
  pt.forEach((e, i) => {
    positions.set(e.id, { x: (1906 + i * 34) / W, y: (700 + i * 26) / H });
  });

  let updated = 0;
  let skipped = 0;
  for (const e of equipment) {
    if (manuallyMoved.has(e.id)) { skipped++; continue; }
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
      after: { updated, skippedManuallyMoved: skipped, basis: "footprint-aware v2, photo row order" },
    },
  });
  console.log(`Repositioned ${updated}; preserved ${skipped} manually-placed pins.`);
}

main().then(() => process.exit(0));
