import Link from "next/link";
import { db } from "@/lib/db";
import { warrantyAlerts } from "@/lib/alerts";
import { fmtDate } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const STAGE_META = {
  0: { label: "Expired", cls: "border-down/40 text-down bg-down/10" },
  30: { label: "≤ 30 days", cls: "border-down/40 text-down bg-down/10" },
  60: { label: "≤ 60 days", cls: "border-warn/40 text-warn bg-warn/10" },
  90: { label: "≤ 90 days", cls: "border-warn/30 text-warn bg-warn/5" },
} as const;

export default async function WarrantyPage() {
  const [alerts, active, withoutWarranty] = await Promise.all([
    warrantyAlerts(),
    db.equipment.findMany({
      where: { warrantyExpiresAt: { gt: new Date(Date.now() + 90 * 86_400_000) }, status: { not: "RETIRED" } },
      orderBy: { warrantyExpiresAt: "asc" },
      select: { id: true, itemId: true, name: true, brand: true, warrantyExpiresAt: true },
    }),
    db.equipment.count({ where: { warrantyExpiresAt: null, status: { not: "RETIRED" } } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-7">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Warranty</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          Expiring and expired coverage · alert stages at 30 / 60 / 90 days · {withoutWarranty} units have no warranty on file
        </p>
      </header>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-[14px] text-ink-secondary">
          Nothing expiring within 90 days. Warranty dates can be added on each equipment page.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const meta = STAGE_META[a.stage];
            return (
              <Link
                key={a.equipmentId}
                href={`/equipment/${a.equipmentId}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition hover:bg-surface-hover"
              >
                <span>
                  <span className="font-medium text-ink">{a.name}</span>
                  <span className="ml-2 text-[13px] text-ink-secondary">{a.brand} · #{a.itemId}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[13px] text-ink-secondary">
                    {fmtDate(a.expiresAt)}
                    {a.daysLeft > 0 ? ` · ${a.daysLeft}d left` : ` · ${-a.daysLeft}d ago`}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[12px] ${meta.cls}`}>{meta.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {active.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold text-ink">Active coverage (beyond 90 days)</h2>
          <div className="mt-3 space-y-1.5">
            {active.map((e) => (
              <Link
                key={e.id}
                href={`/equipment/${e.id}`}
                className="flex items-center justify-between rounded-lg border border-line/60 bg-surface/50 px-4 py-2.5 text-[13px] transition hover:bg-surface-hover"
              >
                <span className="text-ink">
                  {e.name} <span className="text-ink-secondary">· {e.brand} · #{e.itemId}</span>
                </span>
                <span className="font-mono text-up">until {fmtDate(e.warrantyExpiresAt!)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
