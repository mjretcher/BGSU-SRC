// One-shot inventory import per spec §15: import all 208 rows as-is, then
// apply the manual-research corrections (brand fix, model-code notes, manual
// links, nameplate-audit flags) in the same pass, recorded distinctly.
// Usage: npx tsx scripts/import-inventory.ts
import "dotenv/config";
import ExcelJS from "exceljs";
import { db } from "../src/lib/db";
import { ICON_MAP } from "../src/data/icon-map";
import { MANUAL_RESEARCH, type ManualResearchEntry } from "../src/data/manual-research";
import type { BuildingLevel } from "../src/generated/prisma/enums";

const ZONE_TO_LEVEL: Record<string, BuildingLevel> = {
  "Weight Floor": "ENTRY",
  "Cardio deck": "BALCONY",
  "Functional Training Room": "LOWER_2",
  "Weights/Strength": "LOWER_2",
};

// Normalized (0-1) rects on each level's floor-plan image where pins get
// initial grid positions; users drag pins to exact spots in the app.
// Derived from the traced fitness-zone polygons in src/data/floorplans.ts.
const ZONE_RECTS: Record<string, { x0: number; x1: number; y0: number; y1: number }> = {
  "Weight Floor": { x0: 0.248, x1: 0.415, y0: 0.527, y1: 0.655 },
  "Cardio deck": { x0: 0.228, x1: 0.386, y0: 0.451, y1: 0.547 },
  "Functional Training Room": { x0: 0.459, x1: 0.512, y0: 0.36, y1: 0.46 },
  "Weights/Strength": { x0: 0.466, x1: 0.508, y0: 0.352, y1: 0.398 },
};

interface Row {
  serial: string;
  itemId: string;
  name: string;
  zone: string;
  brand: string;
  model: string;
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toUpperCase();
}

function findResearch(row: Row): ManualResearchEntry | undefined {
  const candidates = MANUAL_RESEARCH.filter((e) => {
    const invModel = norm(e.inventoryModel);
    if (!invModel || !row.model) return false;
    return invModel === norm(row.model) || norm(row.model).startsWith(invModel);
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const byBrand = candidates.filter((e) => norm(e.brand) === norm(row.brand));
    if (byBrand.length >= 1) return byBrand[0];
  }
  return candidates[0];
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("data/equipment-inventory.xlsx");
  const ws = wb.worksheets[0];

  const rows: Row[] = [];
  ws.eachRow((r, idx) => {
    if (idx === 1) return;
    const g = (i: number) => String(r.getCell(i).value ?? "").trim();
    if (!g(2) && !g(3)) return;
    rows.push({ serial: g(1), itemId: g(2), name: g(3), zone: g(4), brand: g(5), model: g(6) });
  });
  if (rows.length !== 208) throw new Error(`Expected 208 rows, got ${rows.length}`);

  // Fail loudly on any unmapped item name.
  const unmapped = [...new Set(rows.map((r) => r.name))].filter((n) => !ICON_MAP[n]);
  if (unmapped.length) throw new Error(`Unmapped item names:\n${unmapped.join("\n")}`);

  // Grid placement: cluster by zone, order by icon category then name.
  const byZone = new Map<string, Row[]>();
  for (const r of rows) {
    byZone.set(r.zone, [...(byZone.get(r.zone) ?? []), r]);
  }
  const positions = new Map<string, { x: number; y: number }>();
  for (const [zone, zoneRows] of byZone) {
    const rect = ZONE_RECTS[zone];
    if (!rect) throw new Error(`No zone rect for "${zone}"`);
    const sorted = [...zoneRows].sort(
      (a, b) => ICON_MAP[a.name].localeCompare(ICON_MAP[b.name]) || a.name.localeCompare(b.name),
    );
    const w = rect.x1 - rect.x0;
    const h = rect.y1 - rect.y0;
    // Floor-plan images are ~2:1, so a unit of x covers twice the pixels of y.
    const cols = Math.max(1, Math.round(Math.sqrt((sorted.length * w * 2) / h)));
    const rowsCount = Math.ceil(sorted.length / cols);
    sorted.forEach((r, i) => {
      const c = i % cols;
      const rr = Math.floor(i / cols);
      positions.set(r.itemId, {
        x: rect.x0 + ((c + 0.5) / cols) * w,
        y: rect.y0 + ((rr + 0.5) / Math.max(rowsCount, 1)) * h,
      });
    });
  }

  let imported = 0;
  const corrections: string[] = [];
  const usedResearch = new Set<number>();

  for (const r of rows) {
    const research = findResearch(r);
    if (research) usedResearch.add(research.item);

    const brand = research?.brandCorrection ?? r.brand;
    if (research?.brandCorrection) {
      corrections.push(`item ${r.itemId}: brand "${r.brand}" → "${research.brandCorrection}"`);
    }
    if (research?.officialModel) {
      corrections.push(`item ${r.itemId}: model "${r.model}" → official "${research.officialModel}"`);
    }

    const pos = positions.get(r.itemId)!;
    await db.equipment.upsert({
      where: { itemId: r.itemId },
      create: {
        itemId: r.itemId,
        name: r.name,
        rawItemName: r.name,
        brand,
        model: r.model || null,
        modelNote: research?.officialModel ?? null,
        serial: r.serial || null,
        zone: r.zone,
        level: ZONE_TO_LEVEL[r.zone],
        mapX: pos.x,
        mapY: pos.y,
        iconCategory: ICON_MAP[r.name],
        manualUrl: research?.manualUrl ?? null,
        manualMatch: research?.match ?? "UNREVIEWED",
        manualComment: research?.note ?? null,
        notes: research?.brandCorrection ? `Inventory listed brand as "${r.brand}"; corrected per manual research.` : null,
      },
      update: {}, // idempotent re-runs never clobber in-app edits
    });
    imported++;
  }

  await db.auditLog.create({
    data: {
      actorEmail: "system",
      action: "equipment.bulk_import",
      targetType: "Equipment",
      after: { imported, corrections },
    },
  });

  const unusedResearch = MANUAL_RESEARCH.filter((e) => !usedResearch.has(e.item));
  console.log(`Imported/verified ${imported} equipment records.`);
  console.log(`Corrections applied: ${corrections.length}`);
  for (const c of corrections) console.log("  -", c);
  if (unusedResearch.length) {
    console.log(`Research entries that matched no inventory row (${unusedResearch.length}):`);
    for (const e of unusedResearch) console.log(`  - #${e.item} ${e.brand} ${e.inventoryModel}`);
  }
  const counts = await db.equipment.groupBy({ by: ["manualMatch"], _count: true });
  console.log("Manual match breakdown:", counts.map((c) => `${c.manualMatch}=${c._count}`).join(" "));
}

main().then(() => process.exit(0));
