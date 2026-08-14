import { Suspense } from "react";
import Link from "next/link";
import { fleetMetrics } from "@/lib/fleet";
import type { PeriodKey } from "@/lib/metrics";
import { FleetTable, type FleetRowSerialized } from "@/components/FleetTable";

export const dynamic = "force-dynamic";

export default async function FleetPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = (["week", "month", "ytd", "year"].includes(sp.period ?? "") ? sp.period : "year") as PeriodKey;
  const { rows, label } = await fleetMetrics(period);

  const serialized: FleetRowSerialized[] = rows.map((r) => ({
    id: r.id, itemId: r.itemId, name: r.name, brand: r.brand, model: r.model,
    level: r.level, zone: r.zone, status: r.status, flagged: r.flagged, flagPct: r.flagPct,
    downtimePct: r.metrics.downtimePct, daysDown: r.metrics.daysDown,
    eventCount: r.metrics.eventCount, mttrMs: r.metrics.mttrMs, mtbfMs: r.metrics.mtbfMs,
    repairCost: r.metrics.repairCost,
  }));

  return (
    <main className="p-7">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Fleet</h1>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            All equipment, sortable by the numbers that matter · {label}
          </p>
        </div>
        <Link
          href="/equipment/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#052e2b] transition hover:brightness-110"
        >
          + Add equipment
        </Link>
      </header>
      <Suspense>
        <FleetTable rows={serialized} period={period} />
      </Suspense>
    </main>
  );
}
