import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEVEL_LABEL } from "@/lib/status";
import type { BuildingLevel } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

// The physical half of the QR flow: a printable sheet of one label per machine.
// Print it, cut, laminate, attach. Each label carries the item ID in plain text
// as well as the code, so a peeling or unscannable label is still identifiable
// and the number can be checked against the asset tag by eye.
//
// Filterable by level so a single area can be reprinted without regenerating
// all 200-odd labels.
export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?from=/labels");

  const sp = await searchParams;
  const levels: BuildingLevel[] = ["ENTRY", "BALCONY", "LOWER_2"];
  const level = levels.find((l) => l === sp.level);

  // The QR has to encode an absolute URL, and the deployment host is only known
  // at request time. Prefer the proxy's forwarded host so the printed code
  // matches the address staff actually reach the app on.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const equipment = await db.equipment.findMany({
    where: { status: { not: "RETIRED" }, ...(level ? { level } : {}) },
    orderBy: [{ level: "asc" }, { itemId: "asc" }],
    select: { id: true, itemId: true, name: true, brand: true, level: true, zone: true },
  });

  const labels = await Promise.all(
    equipment.map(async (e) => ({
      ...e,
      url: `${origin}/r/${encodeURIComponent(e.itemId)}`,
      svg: await QRCode.toString(`${origin}/r/${encodeURIComponent(e.itemId)}`, {
        type: "svg",
        margin: 0,
        // Tolerates a scuffed or partly obscured label on a gym floor.
        errorCorrectionLevel: "M",
      }),
    })),
  );

  return (
    <main className="mx-auto max-w-5xl p-6 print:p-0">
      <header className="mb-6 print:hidden">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Equipment QR labels</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          {labels.length} {labels.length === 1 ? "label" : "labels"}
          {level ? ` · ${LEVEL_LABEL[level]}` : " · all levels"} · scanning opens the report screen for
          that machine
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <a
            href="/labels"
            className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] transition ${
              !level ? "border-accent/50 bg-accent-soft text-accent" : "border-line-strong text-ink-secondary hover:text-ink"
            }`}
          >
            All levels
          </a>
          {levels.map((l) => (
            <a
              key={l}
              href={`/labels?level=${l}`}
              className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] transition ${
                level === l ? "border-accent/50 bg-accent-soft text-accent" : "border-line-strong text-ink-secondary hover:text-ink"
              }`}
            >
              {LEVEL_LABEL[l]}
            </a>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-[color:var(--text-faint)]">
          Codes point at {origin}. Reprint if the app moves to a different address.
        </p>
      </header>

      {labels.length === 0 ? (
        <p className="text-[13px] text-ink-secondary print:hidden">No equipment matches that level.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
          {labels.map((l) => (
            <div
              key={l.id}
              // break-inside-avoid stops a label being split across two sheets.
              className="flex break-inside-avoid items-center gap-3 rounded-xl border border-line p-3 print:rounded-none print:border-black/40"
            >
              <div
                className="h-20 w-20 shrink-0 [&>svg]:h-full [&>svg]:w-full"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: l.svg }}
              />
              <div className="min-w-0">
                <p className="font-mono text-[13px] font-semibold text-ink print:text-black">#{l.itemId}</p>
                <p className="truncate text-[12px] leading-snug text-ink print:text-black">{l.name}</p>
                <p className="truncate text-[11px] text-ink-secondary print:text-black/70">{l.brand}</p>
                <p className="truncate text-[10px] text-[color:var(--text-faint)] print:text-black/60">
                  {LEVEL_LABEL[l.level]} · {l.zone}
                </p>
                <p className="mt-0.5 text-[9px] text-[color:var(--text-faint)] print:text-black/50">
                  Scan to report a problem
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
