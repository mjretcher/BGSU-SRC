import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { computeMetrics, trailing12mFlag, fmtDuration, fmtMoney, fmtDate } from "@/lib/metrics";
import {
  STATUS_LABEL, STATUS_TONE, TONE_COLOR, TONE_GLOW, CAUSE_LABEL, LEVEL_LABEL, MANUAL_MATCH_LABEL,
} from "@/lib/status";
import { CATEGORY_ICON } from "@/components/icons";
import { EquipmentEditForm } from "@/components/EquipmentEditForm";
import type { EquipmentStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function EquipmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await db.equipment.findUnique({
    where: { id },
    include: {
      events: { orderBy: { openedAt: "desc" } },
      maintenance: { orderBy: { date: "desc" } },
    },
  });
  if (!e) notFound();

  const end = new Date();
  const start = new Date(end.getTime() - 364 * DAY);
  const metrics = computeMetrics(e.events, start, end);
  const flag = trailing12mFlag(e.events);
  const lifetimeCost = e.events.reduce((a, ev) => a + Number(ev.repairCost ?? 0), 0);
  const tone = STATUS_TONE[e.status as EquipmentStatus];
  const Icon = CATEGORY_ICON[e.iconCategory];

  // ── Calendar heatmap: fraction of each of the past 364 days spent down ──
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const days: { date: Date; frac: number }[] = [];
  for (let t = dayStart.getTime(); t <= end.getTime(); t += DAY) {
    const d0 = t, d1 = t + DAY;
    let downMs = 0;
    for (const ev of e.events) {
      const s = Math.max(ev.openedAt.getTime(), d0);
      const en = Math.min((ev.closedAt ?? end).getTime(), d1);
      if (en > s) downMs += en - s;
    }
    days.push({ date: new Date(t), frac: Math.min(1, downMs / DAY) });
  }
  // pad so the grid starts on Sunday
  const pad = days[0]?.date.getDay() ?? 0;
  const cells: ({ date: Date; frac: number } | null)[] = [...Array<null>(pad).fill(null), ...days];
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // ── Timeline bars over the same 12-month window ──
  const spanMs = end.getTime() - dayStart.getTime();
  const bars = e.events
    .filter((ev) => (ev.closedAt ?? end) > dayStart)
    .map((ev) => {
      const s = Math.max(ev.openedAt.getTime(), dayStart.getTime());
      const en = Math.min((ev.closedAt ?? end).getTime(), end.getTime());
      return {
        id: ev.id,
        left: ((s - dayStart.getTime()) / spanMs) * 100,
        width: Math.max(0.4, ((en - s) / spanMs) * 100),
        open: !ev.closedAt,
        label: `${CAUSE_LABEL[ev.cause]} · ${fmtDate(ev.openedAt)}${ev.closedAt ? ` – ${fmtDate(ev.closedAt)}` : " – open"}`,
      };
    });

  const monthTicks = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(dayStart.getFullYear(), dayStart.getMonth() + i, 1);
    return { left: ((d.getTime() - dayStart.getTime()) / spanMs) * 100, label: d.toLocaleDateString("en-US", { month: "short", timeZone: "America/New_York" }) };
  }).filter((t) => t.left >= 0 && t.left <= 100);

  return (
    <main className="mx-auto max-w-5xl p-7">
      <Link href="/" className="text-[13px] text-ink-secondary transition hover:text-accent">← Facility map</Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl border"
            style={{ borderColor: TONE_COLOR[tone], color: TONE_COLOR[tone], boxShadow: `0 0 18px ${TONE_GLOW[tone]}` }}
          >
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{e.name}</h1>
            <p className="mt-1 text-[14px] text-ink-secondary">
              {e.brand}
              {e.model && <span className="font-mono"> · {e.model}</span>}
              {e.modelNote && <span className="text-accent"> (official: {e.modelNote})</span>}
              <span className="text-[color:var(--text-faint)]"> · #{e.itemId} · {LEVEL_LABEL[e.level]} · {e.zone}</span>
            </p>
            <p className="mt-2 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]"
                style={{ borderColor: TONE_COLOR[tone], color: TONE_COLOR[tone] }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />
                {STATUS_LABEL[e.status]}
              </span>
              {flag.flagged && (
                <span className="rounded-full border border-down/40 bg-down/10 px-3 py-1 text-[12px] text-down">
                  ⚑ {flag.pct.toFixed(1)}% downtime trailing 12 mo — flagged for replacement review
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-5 gap-3">
        {[
          ["Downtime (12 mo)", `${metrics.downtimePct.toFixed(2)}%`],
          ["Days down", metrics.daysDown.toFixed(1)],
          ["Events", String(metrics.eventCount)],
          ["MTTR", fmtDuration(metrics.mttrMs)],
          ["Repair cost (lifetime)", fmtMoney(lifetimeCost)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-faint)]">{k}</p>
            <p className="mt-1.5 font-mono text-xl text-ink">{v}</p>
          </div>
        ))}
      </div>

      {/* Calendar heatmap */}
      <section className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">Days down — past 12 months</h2>
        <div className="mt-4 overflow-x-auto">
          <svg width={weeks.length * 14 + 4} height={7 * 14 + 4} className="block">
            {weeks.map((week, wi) =>
              week.map((cell, di) => {
                if (!cell) return null;
                const fill =
                  cell.frac === 0
                    ? "rgba(148,163,184,0.08)"
                    : `rgba(248,113,113,${0.25 + cell.frac * 0.65})`;
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={wi * 14 + 2}
                    y={di * 14 + 2}
                    width={11}
                    height={11}
                    rx={2.5}
                    fill={fill}
                  >
                    <title>{`${fmtDate(cell.date)} — ${cell.frac === 0 ? "in service" : `${Math.round(cell.frac * 100)}% down`}`}</title>
                  </rect>
                );
              }),
            )}
          </svg>
        </div>
      </section>

      {/* Timeline */}
      <section className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">Incident timeline</h2>
        <div className="relative mt-4 h-16 rounded-lg border border-line bg-bg-raised">
          {monthTicks.map((t) => (
            <div key={t.label + t.left} className="absolute top-0 h-full border-l border-line/60" style={{ left: `${t.left}%` }}>
              <span className="absolute -bottom-5 left-1 text-[10px] text-[color:var(--text-faint)]">{t.label}</span>
            </div>
          ))}
          {bars.map((b) => (
            <div
              key={b.id}
              title={b.label}
              className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full"
              style={{
                left: `${b.left}%`,
                width: `${b.width}%`,
                background: b.open ? "var(--status-down)" : "rgba(248,113,113,0.55)",
                boxShadow: b.open ? "0 0 10px var(--status-down-glow)" : undefined,
              }}
            />
          ))}
          {bars.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-[13px] text-[color:var(--text-faint)]">
              No downtime in this window
            </p>
          )}
        </div>
        <div className="h-4" />
      </section>

      {/* Manual */}
      <section className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          Manual
          <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-normal text-ink-secondary">
            {MANUAL_MATCH_LABEL[e.manualMatch]}
          </span>
        </h2>
        {e.manualComment && <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{e.manualComment}</p>}
        <div className="mt-3 flex gap-2">
          {e.manualUrl && (
            <a href={e.manualUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line-strong px-3.5 py-2 text-[13px] text-ink-secondary transition hover:border-accent/50 hover:text-ink">
              Manufacturer manual ↗
            </a>
          )}
          {e.manualPdfUrl && (
            <a href={e.manualPdfUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line-strong px-3.5 py-2 text-[13px] text-ink-secondary transition hover:border-accent/50 hover:text-ink">
              Stored PDF ↗
            </a>
          )}
          {!e.manualUrl && !e.manualPdfUrl && (
            <p className="text-[13px] text-[color:var(--text-faint)]">No manual attached — add links in the editor below.</p>
          )}
        </div>
      </section>

      <div className="mt-4">
        <EquipmentEditForm
          equipment={{
            id: e.id,
            name: e.name,
            brand: e.brand,
            model: e.model,
            serial: e.serial,
            vendor: e.vendor,
            purchaseDate: e.purchaseDate?.toISOString() ?? null,
            cost: e.cost?.toString() ?? null,
            warrantyMonths: e.warrantyMonths,
            warrantyExpiresAt: e.warrantyExpiresAt?.toISOString() ?? null,
            manualUrl: e.manualUrl,
            manualPdfUrl: e.manualPdfUrl,
            notes: e.notes,
          }}
        />
      </div>

      {/* Event history */}
      <section className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">Downtime history</h2>
        {e.events.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-secondary">Never been down.</p>
        ) : (
          <table className="mt-3 w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-[color:var(--text-faint)]">
                <th className="py-2 pr-3">Opened</th>
                <th className="py-2 pr-3">Closed</th>
                <th className="py-2 pr-3">Duration</th>
                <th className="py-2 pr-3">Cause</th>
                <th className="py-2 pr-3 text-right">Cost</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {e.events.map((ev) => (
                <tr key={ev.id} className="border-b border-line/50 last:border-0">
                  <td className="py-2.5 pr-3 text-ink">{fmtDate(ev.openedAt)}</td>
                  <td className="py-2.5 pr-3 text-ink-secondary">{ev.closedAt ? fmtDate(ev.closedAt) : <span className="text-down">open</span>}</td>
                  <td className="py-2.5 pr-3 font-mono text-ink-secondary">
                    {fmtDuration((ev.closedAt ?? new Date()).getTime() - ev.openedAt.getTime())}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-secondary">{CAUSE_LABEL[ev.cause]}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-ink">{ev.repairCost ? fmtMoney(Number(ev.repairCost)) : "—"}</td>
                  <td className="py-2.5 text-ink-secondary">{ev.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Maintenance */}
      <section className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">
          Maintenance log <span className="text-[12px] font-normal text-[color:var(--text-faint)]">(excluded from downtime %)</span>
        </h2>
        {e.maintenance.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-secondary">No maintenance recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {e.maintenance.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-4 rounded-lg border border-line bg-bg-raised px-3.5 py-2.5 text-[13px]">
                <span className="text-ink">{m.notes}</span>
                <span className="shrink-0 font-mono text-ink-secondary">
                  {fmtDate(m.date)}
                  {m.cost && ` · ${fmtMoney(Number(m.cost))}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
