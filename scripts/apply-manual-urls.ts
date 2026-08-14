// Apply verified manual URLs (scripts/manual-url-updates.json, produced by the
// URL-verification research pass) to matching equipment rows. Rows where a
// user manually edited manualUrl in-app (audit: equipment.updated touching
// manualUrl by a non-system actor) are left alone.
// Usage: npx tsx scripts/apply-manual-urls.ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { MANUAL_RESEARCH } from "../src/data/manual-research";

interface Update {
  item: number;
  manualUrl: string;
  verified: string;
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toUpperCase();
}

async function main() {
  const updates = JSON.parse(readFileSync("scripts/manual-url-updates.json", "utf8")) as Update[];
  const [equipment, editLogs] = await Promise.all([
    db.equipment.findMany({ select: { id: true, itemId: true, model: true, brand: true, manualUrl: true, name: true } }),
    db.auditLog.findMany({
      where: { action: "equipment.updated", actorEmail: { not: "system" } },
      select: { targetId: true, after: true },
    }),
  ]);
  const userEditedManual = new Set(
    editLogs
      .filter((l) => l.after && typeof l.after === "object" && "manualUrl" in (l.after as object))
      .map((l) => l.targetId),
  );

  let applied = 0;
  let skippedUserEdit = 0;
  const details: string[] = [];

  for (const u of updates) {
    const entry = MANUAL_RESEARCH.find((e) => e.item === u.item);
    if (!entry) continue;
    const invModel = norm(entry.inventoryModel);
    const matches = equipment.filter((e) => {
      if (!e.model || !invModel) return false;
      return norm(e.model) === invModel || norm(e.model).startsWith(invModel);
    });
    for (const m of matches) {
      if (userEditedManual.has(m.id)) {
        skippedUserEdit++;
        continue;
      }
      if (m.manualUrl === u.manualUrl) continue;
      await db.equipment.update({ where: { id: m.id }, data: { manualUrl: u.manualUrl } });
      applied++;
      details.push(`#${m.itemId} ${m.name} ← item ${u.item}`);
    }
  }

  await db.auditLog.create({
    data: {
      actorEmail: "system",
      action: "equipment.manual_urls_applied",
      targetType: "Equipment",
      after: { applied, skippedUserEdit, source: "verified manual-url research pass" },
    },
  });
  console.log(`Applied verified manual URLs to ${applied} units (${skippedUserEdit} skipped as user-edited).`);
  for (const d of details) console.log("  -", d);

  const still = await db.equipment.count({ where: { manualUrl: null } });
  console.log(`Units still without a manual link: ${still}`);
}

main().then(() => process.exit(0));
