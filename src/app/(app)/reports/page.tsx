import Link from "next/link";
import { fleetMetrics } from "@/lib/fleet";
import { downtimeFlags } from "@/lib/alerts";
import { db } from "@/lib/db";
import { fmtDuration, fmtMoney, type PeriodKey } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const PERIODS: [PeriodKey, string][] = [
  ["week", "Week"],
  ["month", "Month"],
  ["ytd", "Year to date"],
  ["year", "Trailing 12 months"],
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; maint?: string }> }) {
  const sp = await searchParams;
  const period = (["week", "month", "ytd", "year"].includes(sp.period ?? "") ? sp.period : "year") as PeriodKey;
  const includeMaint = sp.maint === "1";
  const [{ rows, start, end, label }, flags, maintenance] = await Promise.all([
    fleetMetrics(period),
    downtimeFlags(),
    db.maintenanceRecord.findMany({ select: { equipmentId: true, date: true, cost: true } }),
  ]);

  const periodMs = end.getTime() - start.getTime();
  // Optional report view: count each maintenance day as one day of downtime
  // (records are point-in-time; spec §7 keeps them excluded by default).
  const maintByEq = new Map<string, number>();
  const maintCostByEq = new Map<string, number>();
  for (const m of maintenance) {
    if (m.date >= start && m.date <= end) {
      maintByEq.set(m.equipmentId, (maintByEq.get(m.equipmentId) ?? 0) + 1);
      maintCostByEq.set(m.equipmentId, (maintCostByEq.get(m.equipmentId) ?? 0) + Number(m.cost ?? 0));
    }
  }

  const enriched = rows.map((r) => {
    const maintDays = maintByEq.get(r.id) ?? 0;
    const pct = includeMaint ? r.metrics.downtimePct + (maintDays * 86_400_000 * 100) / periodMs : r.metrics.downtimePct;
    return { ...r, effectivePct: pct, maintDays, maintCost: maintCostByEq.get(r.id) ?? 0 };
  });

  const totalRepair = enriched.reduce((a, r) => a + r.metrics.repairCost, 0);
  const totalMaintCost = enriched.reduce((a, r) => a + r.maintCost, 0);
  const withDowntime = enriched.filter((r) => r.metrics.downtimeMs > 0);
  const avgPct = enriched.length ? enriched.reduce((a, r) => a + r.effectivePct, 0) / enriched.length : 0;
  const closedMttrs = enriched.map((r) => r.metrics.mttrMs).filter((v): v is number => v !== null);
  const fleetMttr = closedMttrs.length ? closedMttrs.reduce((a, b) => a + b, 0) / closedMttrs.length : null;
  const worst = [...enriched].sort((a, b) => b.effectivePct - a.effectivePct).slice(0, 10);
  const costliest = [...enriched].sort((a, b) => b.metrics.repairCost - a.metrics.repairCost).slice(0, 5);

  const exportQs = `period=${period}`;

  return (
    <main className="mx-auto max-w-5xl p-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Reports</h1>
          <p className="mt-0.5 text-[13px] text-ink-secondary">{label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-lg border border-line p-1">
            {PERIODS.map(([key, plabel]) => (
              <Link
                key={key}
                href={`?period=${key}${includeMaint ? "&maint=1" : ""}`}
                className={`rounded-md px-2.5 py-1.5 text-[13px] transition ${
                  period === key ? "bg-accent-soft text-accent" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {plabel}
              </Link>
            ))}
          </span>
          <Link
            href={`?period=${period}${includeMaint ? "" : "&maint=1"}`}
            className={`rounded-lg border px-3 py-2 text-[13px] transition ${
              includeMaint ? "border-warn/50 bg-warn/10 text-warn" : "border-line-strong text-ink-secondary hover:text-ink"
            }`}
          >
            {includeMaint ? "Maintenance included" : "Include maintenance"}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3">
        {[
          ["Fleet avg downtime", `${avgPct.toFixed(2)}%`],
          ["Units with downtime", `${withDowntime.length} / ${enriched.length}`],
          ["Fleet MTTR", fmtDuration(fleetMttr)],
          ["Repair spend", fmtMoney(totalRepair) + (includeMaint && totalMaintCost ? ` (+${fmtMoney(totalMaintCost)} maint)` : "")],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-faint)]">{k}</p>
            <p className="mt-1.5 font-mono text-xl text-ink">{v}</p>
          </div>
        ))}
      </div>

      {/* Exports */}
      <section className="mt-6 flex items-center gap-2.5 rounded-xl border border-line bg-surface p-4">
        <p className="mr-2 text-[13px] text-ink-secondary">Export this period:</p>
        {[
          ["pdf", "PDF"],
          ["xlsx", "Excel"],
          ["csv", "CSV"],
        ].map(([fmt, flabel]) => (
          <a
            key={fmt}
            href={`/api/export?fmt=${fmt}&${exportQs}`}
            className="rounded-lg border border-line-strong px-4 py-2 text-[13px] text-ink-secondary transition hover:border-accent/50 hover:text-ink"
          >
            {flabel} ↓
          </a>
        ))}
        <p className="ml-auto text-[12px] text-[color:var(--text-faint)]">Exports use downtime-only numbers</p>
      </section>

      {/* Flagged */}
      <section className="mt-6 rounded-xl border border-down/25 bg-down/5 p-5">
        <h2 className="text-[15px] font-semibold text-down">
          ⚑ Replacement review — ≥5% downtime, trailing 12 months ({flags.length})
        </h2>
        {flags.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-secondary">No equipment currently crosses the 5% threshold.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {flags.map((f) => (
              <Link
                key={f.equipmentId}
                href={`/equipment/${f.equipmentId}`}
                className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] transition hover:bg-surface-hover"
              >
                <span className="text-ink">{f.name} <span className="text-ink-secondary">#{f.itemId}</span></span>
                <span className="font-mono text-down">{f.pct.toFixed(1)}%</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-[15px] font-semibold text-ink">Worst downtime {includeMaint && <span className="text-[11px] font-normal text-warn">(incl. maintenance)</span>}</h2>
          <div className="mt-3 space-y-2">
            {worst.map((r) => (
              <Link key={r.id} href={`/equipment/${r.id}`} className="block">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="truncate text-ink">{r.name} <span className="text-[color:var(--text-faint)]">#{r.itemId}</span></span>
                  <span className={`ml-3 font-mono ${r.effectivePct >= 5 ? "text-down" : "text-ink-secondary"}`}>
                    {r.effectivePct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-raised">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, r.effectivePct * 10)}%`,
                      background: r.effectivePct >= 5 ? "var(--status-down)" : "var(--status-warn)",
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-[15px] font-semibold text-ink">Highest repair spend</h2>
          <div className="mt-3 space-y-2">
            {costliest.map((r) => (
              <Link key={r.id} href={`/equipment/${r.id}`} className="flex items-center justify-between rounded-lg border border-line/60 bg-bg-raised px-3.5 py-2.5 text-[13px] transition hover:bg-surface-hover">
                <span className="truncate text-ink">{r.name} <span className="text-[color:var(--text-faint)]">#{r.itemId}</span></span>
                <span className="ml-3 font-mono text-ink">{r.metrics.repairCost ? fmtMoney(r.metrics.repairCost) : "—"}</span>
              </Link>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[12px] text-[color:var(--text-faint)]">
            Full sortable table with every unit → <Link href={`/fleet?period=${period}`} className="text-accent">Fleet view</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
