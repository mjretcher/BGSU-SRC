"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import type { EquipmentStatus, CauseCategory } from "@/generated/prisma/enums";
import {
  STATUS_LABEL, STATUS_SHORT, STATUS_TONE, TONE_COLOR, TONE_GLOW,
  CAUSE_LABEL, DOWN_STATUSES, MANUAL_MATCH_LABEL, LEVEL_LABEL, isDown,
} from "@/lib/status";
import { fmtDuration, fmtMoney } from "@/lib/metrics";
import { CATEGORY_ICON, XIcon, WrenchIcon, BookIcon } from "../icons";

interface Detail {
  equipment: {
    id: string; itemId: string; name: string; brand: string; model: string | null;
    modelNote: string | null; serial: string | null; zone: string; level: keyof typeof LEVEL_LABEL;
    iconCategory: keyof typeof CATEGORY_ICON; status: EquipmentStatus;
    manualUrl: string | null; manualPdfUrl: string | null; manualMatch: keyof typeof MANUAL_MATCH_LABEL;
    manualComment: string | null; warrantyExpiresAt: string | null; vendor: string | null; notes: string | null;
    events: { id: string; status: EquipmentStatus; cause: CauseCategory; openedAt: string; closedAt: string | null; repairCost: string | null; notes: string | null }[];
    maintenance: { id: string; date: string; notes: string; cost: string | null }[];
  };
  metrics: {
    downtimePct: number; daysDown: number; eventCount: number;
    mttrMs: number | null; mtbfMs: number | null; repairCost: number; lifetimeCost: number;
    flag: { flagged: boolean; pct: number };
  };
}

const inputCls =
  "w-full rounded-lg border border-line-strong bg-bg-raised px-3 py-2 text-sm text-ink outline-none transition focus:border-accent";
const btnPrimary =
  "rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-line-strong px-3.5 py-2 text-sm text-ink-secondary transition hover:border-accent/50 hover:text-ink";

export function EquipmentPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [mode, setMode] = useState<"view" | "report" | "close" | "maintenance">("view");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const res = await fetch(`/api/equipment/${id}`);
    if (res.ok) setData((await res.json()) as Detail);
  }, [id]);

  useEffect(() => {
    setData(null);
    setMode("view");
    void load();
  }, [load]);

  async function mutate(fn: () => Promise<Response>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      setMode("view");
      await load();
      router.refresh();
    }
    return res.ok;
  }

  const e = data?.equipment;
  const tone = e ? STATUS_TONE[e.status] : "up";
  const openEvent = e?.events.find((ev) => !ev.closedAt) ?? null;
  const Icon = e ? CATEGORY_ICON[e.iconCategory] : null;

  return (
    <motion.aside
      initial={{ x: "105%" }}
      animate={{ x: 0 }}
      exit={{ x: "105%" }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-line bg-bg-raised/95 shadow-2xl backdrop-blur-xl"
    >
      {!e ? (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-secondary">Loading…</div>
      ) : (
        <>
          <header className="border-b border-line p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                  style={{ borderColor: TONE_COLOR[tone], color: TONE_COLOR[tone], boxShadow: `0 0 14px ${TONE_GLOW[tone]}` }}
                >
                  {Icon && <Icon className="h-6 w-6" />}
                </span>
                <div>
                  <h2 className="text-[17px] font-semibold leading-tight tracking-tight text-ink">{e.name}</h2>
                  <p className="mt-0.5 text-[13px] text-ink-secondary">
                    {e.brand}
                    {e.model && <span className="font-mono"> · {e.model}</span>}
                    <span className="text-[color:var(--text-faint)]"> · #{e.itemId}</span>
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-secondary transition hover:bg-surface-hover hover:text-ink">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]"
                style={{ borderColor: TONE_COLOR[tone], color: TONE_COLOR[tone] }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[tone], boxShadow: `0 0 6px ${TONE_GLOW[tone]}` }} />
                {STATUS_LABEL[e.status]}
              </span>
              {data.metrics.flag.flagged && (
                <span className="rounded-full border border-down/40 bg-down/10 px-3 py-1 text-[12px] text-down">
                  ⚑ {data.metrics.flag.pct.toFixed(1)}% down (12 mo) — review for replacement
                </span>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Metrics strip */}
            <div className="grid grid-cols-4 gap-2">
              {[
                ["Downtime 12 mo", `${data.metrics.downtimePct.toFixed(1)}%`],
                ["Events", String(data.metrics.eventCount)],
                ["MTTR", fmtDuration(data.metrics.mttrMs)],
                ["Repair cost", fmtMoney(data.metrics.lifetimeCost)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-faint)]">{k}</p>
                  <p className="mt-1 font-mono text-[15px] text-ink">{v}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              {e.status === "IN_SERVICE" && (
                <button className={btnPrimary} onClick={() => setMode("report")}>Report downtime</button>
              )}
              {openEvent && (
                <button className={btnPrimary} onClick={() => setMode("close")}>Close event</button>
              )}
              {e.status !== "RETIRED" && (
                <button className={btnGhost} onClick={() => setMode("maintenance")}>
                  <span className="flex items-center gap-1.5"><WrenchIcon className="h-4 w-4" /> Log maintenance</span>
                </button>
              )}
              <Link href={`/equipment/${e.id}`} className={btnGhost}>Full history →</Link>
            </div>

            {mode === "report" && (
              <ReportForm
                busy={busy}
                onCancel={() => setMode("view")}
                onSubmit={(status, cause, notes) =>
                  mutate(() =>
                    fetch("/api/downtime", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ equipmentId: e.id, status, cause, notes }),
                    }),
                  )
                }
              />
            )}

            {mode === "close" && openEvent && (
              <CloseForm
                busy={busy}
                onCancel={() => setMode("view")}
                onSubmit={(repairCost, notes, retire) =>
                  mutate(() =>
                    fetch(`/api/downtime/${openEvent.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ close: true, repairCost, notes, retire }),
                    }),
                  )
                }
              />
            )}

            {mode === "maintenance" && (
              <MaintenanceForm
                busy={busy}
                onCancel={() => setMode("view")}
                onSubmit={(date, notes, cost) =>
                  mutate(() =>
                    fetch("/api/maintenance", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ equipmentId: e.id, date, notes, cost }),
                    }),
                  )
                }
              />
            )}

            {/* Open event substatus movement */}
            {openEvent && mode === "view" && (
              <section className="mt-6">
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--text-faint)]">
                  Open event · since {new Date(openEvent.openedAt).toLocaleDateString()} · {CAUSE_LABEL[openEvent.cause]}
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {DOWN_STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy || s === e.status}
                      onClick={() =>
                        mutate(() =>
                          fetch(`/api/downtime/${openEvent.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: s }),
                          }),
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                        s === e.status
                          ? "border-warn/60 bg-warn/10 text-warn"
                          : "border-line-strong text-ink-secondary hover:border-accent/50 hover:text-ink"
                      }`}
                    >
                      {STATUS_SHORT[s]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Manual */}
            <section className="mt-6 rounded-xl border border-line bg-surface p-4">
              <h3 className="flex items-center gap-2 text-[13px] font-medium text-ink">
                <BookIcon className="h-4 w-4 text-accent" /> Manual
                <span className="ml-auto rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-secondary">
                  {MANUAL_MATCH_LABEL[e.manualMatch]}
                </span>
              </h3>
              {e.modelNote && (
                <p className="mt-2 text-[12px] text-ink-secondary">
                  Official model code: <span className="font-mono text-ink">{e.modelNote}</span>
                </p>
              )}
              {e.manualComment && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">{e.manualComment}</p>}
              <div className="mt-3 flex gap-2">
                {e.manualUrl && (
                  <a href={e.manualUrl} target="_blank" rel="noreferrer" className={btnGhost + " text-[13px]"}>
                    Manufacturer manual ↗
                  </a>
                )}
                {e.manualPdfUrl && (
                  <a href={e.manualPdfUrl} target="_blank" rel="noreferrer" className={btnGhost + " text-[13px]"}>
                    Stored PDF ↗
                  </a>
                )}
                {!e.manualUrl && !e.manualPdfUrl && (
                  <p className="text-[12px] text-[color:var(--text-faint)]">No manual attached yet.</p>
                )}
              </div>
            </section>

            {/* Facts */}
            <section className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-line bg-surface p-4 text-[13px]">
              {[
                ["Location", `${LEVEL_LABEL[e.level]} · ${e.zone}`],
                ["Serial", e.serial ?? "—"],
                ["Vendor", e.vendor ?? "—"],
                ["Warranty", e.warrantyExpiresAt ? `until ${new Date(e.warrantyExpiresAt).toLocaleDateString()}` : "not on file"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-faint)]">{k}</p>
                  <p className="mt-0.5 text-ink">{v}</p>
                </div>
              ))}
              {e.notes && (
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-faint)]">Notes</p>
                  <p className="mt-0.5 leading-relaxed text-ink-secondary">{e.notes}</p>
                </div>
              )}
            </section>

            {/* Recent history */}
            <section className="mt-4">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--text-faint)]">Recent events</h3>
              {e.events.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-secondary">No downtime recorded. 🎉</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {e.events.slice(0, 5).map((ev) => {
                    const evTone = ev.closedAt ? "retired" : STATUS_TONE[ev.status];
                    return (
                      <li key={ev.id} className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-ink">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: ev.closedAt ? "var(--status-retired)" : TONE_COLOR[evTone] }}
                            />
                            {CAUSE_LABEL[ev.cause]}
                          </span>
                          <span className="font-mono text-[12px] text-ink-secondary">
                            {ev.repairCost ? fmtMoney(Number(ev.repairCost)) : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-ink-secondary">
                          {new Date(ev.openedAt).toLocaleDateString()} →{" "}
                          {ev.closedAt ? new Date(ev.closedAt).toLocaleDateString() : "open"}
                          {ev.notes && <span className="text-[color:var(--text-faint)]"> · {ev.notes}</span>}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </motion.aside>
  );
}

function ReportForm({
  busy, onSubmit, onCancel,
}: {
  busy: boolean;
  onSubmit: (status: EquipmentStatus, cause: CauseCategory, notes: string) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<EquipmentStatus>("DOWN_REPORTED");
  const [cause, setCause] = useState<CauseCategory>("UNKNOWN_OTHER");
  const [notes, setNotes] = useState("");
  return (
    <div className="mt-5 rounded-xl border border-down/30 bg-down/5 p-4">
      <h3 className="text-sm font-medium text-ink">Report downtime</h3>
      <div className="mt-3 space-y-3">
        <label className="block text-[12px] text-ink-secondary">
          Status
          <select className={inputCls + " mt-1"} value={status} onChange={(e) => setStatus(e.target.value as EquipmentStatus)}>
            {DOWN_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] text-ink-secondary">
          Cause
          <select className={inputCls + " mt-1"} value={cause} onChange={(e) => setCause(e.target.value as CauseCategory)}>
            {(Object.keys(CAUSE_LABEL) as CauseCategory[]).map((c) => (
              <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] text-ink-secondary">
          Notes
          <textarea className={inputCls + " mt-1"} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's wrong?" />
        </label>
        <div className="flex gap-2">
          <button className={btnPrimary} disabled={busy} onClick={() => onSubmit(status, cause, notes)}>Log it</button>
          <button className={btnGhost} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CloseForm({
  busy, onSubmit, onCancel,
}: {
  busy: boolean;
  onSubmit: (repairCost: string, notes: string, retire: boolean) => void;
  onCancel: () => void;
}) {
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [retire, setRetire] = useState(false);
  return (
    <div className="mt-5 rounded-xl border border-up/30 bg-up/5 p-4">
      <h3 className="text-sm font-medium text-ink">Close event</h3>
      <div className="mt-3 space-y-3">
        <label className="block text-[12px] text-ink-secondary">
          Repair cost (USD)
          <input className={inputCls + " mt-1"} type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
        </label>
        <label className="block text-[12px] text-ink-secondary">
          Resolution notes
          <textarea className={inputCls + " mt-1"} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What fixed it?" />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink-secondary">
          <input type="checkbox" checked={retire} onChange={(e) => setRetire(e.target.checked)} className="accent-[var(--status-down)]" />
          Retire this equipment instead of returning it to service
        </label>
        <div className="flex gap-2">
          <button className={btnPrimary} disabled={busy} onClick={() => onSubmit(cost, notes, retire)}>
            {retire ? "Close & retire" : "Close — back in service"}
          </button>
          <button className={btnGhost} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function MaintenanceForm({
  busy, onSubmit, onCancel,
}: {
  busy: boolean;
  onSubmit: (date: string, notes: string, cost: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-4">
      <h3 className="text-sm font-medium text-ink">Log maintenance</h3>
      <p className="mt-1 text-[12px] text-[color:var(--text-faint)]">Excluded from downtime % by default.</p>
      <div className="mt-3 space-y-3">
        <label className="block text-[12px] text-ink-secondary">
          Date
          <input className={inputCls + " mt-1"} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block text-[12px] text-ink-secondary">
          Notes
          <textarea className={inputCls + " mt-1"} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Belt lubed, console updated…" />
        </label>
        <label className="block text-[12px] text-ink-secondary">
          Cost (optional)
          <input className={inputCls + " mt-1"} type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
        </label>
        <div className="flex gap-2">
          <button className={btnPrimary} disabled={busy || !notes.trim()} onClick={() => onSubmit(date, notes, cost)}>Save</button>
          <button className={btnGhost} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
