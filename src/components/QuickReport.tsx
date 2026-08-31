"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CauseCategory, EquipmentStatus } from "@/generated/prisma/enums";
import { CAUSE_LABEL } from "@/lib/status";
import { DurationPicker } from "./DurationPicker";

// The phone half of the QR flow. Every action here posts to the same endpoints
// the desktop panel uses, so nothing about how downtime is recorded forks: this
// is a second way in, not a second implementation.
//
// Sized for one hand at the machine — one column, full-width controls, and the
// three choices a person standing there actually has: it's broken, I fixed it,
// or it's back up.

type Mode = "idle" | "down" | "fixed" | "close";

const CAUSES = Object.keys(CAUSE_LABEL) as CauseCategory[];

// min-h-12 keeps every tap target comfortably above the ~44px minimum.
const bigButton =
  "w-full min-h-12 rounded-xl px-4 py-3 text-[15px] font-medium transition disabled:opacity-50";
const primary = `${bigButton} bg-accent text-white hover:opacity-90`;
const ghost = `${bigButton} border border-line-strong text-ink hover:border-accent/50`;
const field =
  "w-full min-h-12 rounded-xl border border-line-strong bg-bg-raised px-3 py-3 text-[16px] text-ink outline-none transition focus:border-accent";

export function QuickReport({
  equipmentId,
  status,
  openEvent,
}: {
  equipmentId: string;
  status: EquipmentStatus;
  openEvent: { id: string; openedAt: string } | null;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [cause, setCause] = useState<CauseCategory>("UNKNOWN_OTHER");
  const [notes, setNotes] = useState("");
  const [durationMs, setDurationMs] = useState<number | null>(5 * 60_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  async function send(method: "POST" | "PATCH", url: string, body: unknown, success: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The API returns a readable message for every rejection it makes, so
        // show that rather than a generic failure.
        setError(json.error ?? "Something went wrong. Try again.");
        return;
      }
      setDone(success);
      setMode("idle");
      setNotes("");
      router.refresh();
    } catch {
      setError("No connection. Check signal and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-up/30 bg-up/5 p-5 text-center">
        <p className="text-[15px] font-medium text-up">{done}</p>
        <button className={`${ghost} mt-4`} onClick={() => setDone(null)}>
          Log something else
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <p role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-[13px] text-down">
          {error}
        </p>
      )}

      {mode === "idle" && (
        <>
          {!openEvent && status !== "RETIRED" && (
            <>
              <button className={primary} onClick={() => setMode("down")}>
                Report this is broken
              </button>
              <button className={ghost} onClick={() => setMode("fixed")}>
                I already fixed it
              </button>
            </>
          )}
          {openEvent && (
            <button className={primary} onClick={() => setMode("close")}>
              It&rsquo;s working again
            </button>
          )}
          {status === "RETIRED" && (
            <p className="rounded-xl border border-line p-4 text-[13px] text-ink-secondary">
              This equipment is retired. Nothing to report.
            </p>
          )}
        </>
      )}

      {mode === "down" && (
        <section className="space-y-3 rounded-xl border border-down/30 bg-down/5 p-4">
          <h2 className="text-[15px] font-medium text-ink">What&rsquo;s wrong?</h2>
          <label className="block text-[13px] text-ink-secondary">
            Cause
            <select className={`${field} mt-1`} value={cause} onChange={(e) => setCause(e.target.value as CauseCategory)}>
              {CAUSES.map((c) => (
                <option key={c} value={c}>{CAUSE_LABEL[c]}</option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] text-ink-secondary">
            Notes (optional)
            <textarea
              className={`${field} mt-1`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened?"
            />
          </label>
          <button
            className={primary}
            disabled={busy}
            onClick={() => send("POST", "/api/downtime", { equipmentId, cause, notes }, "Reported. Thanks — it's marked down.")}
          >
            {busy ? "Reporting…" : "Report it down"}
          </button>
          <button className={ghost} onClick={() => setMode("idle")}>Cancel</button>
        </section>
      )}

      {mode === "fixed" && (
        <section className="space-y-3 rounded-xl border border-warn/30 bg-warn/5 p-4">
          <h2 className="text-[15px] font-medium text-ink">Already fixed</h2>
          <p className="text-[12.5px] text-[color:var(--text-faint)]">
            Logs a closed event ending now, so the outage still counts toward % downtime and MTTR
            without ever marking the machine down.
          </p>
          <label className="block text-[13px] text-ink-secondary">
            How long was it out of service?
            <div className="mt-1">
              <DurationPicker valueMs={durationMs} onChange={setDurationMs} />
            </div>
          </label>
          <label className="block text-[13px] text-ink-secondary">
            Notes (optional)
            <textarea
              className={`${field} mt-1`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was wrong, what fixed it…"
            />
          </label>
          <button
            className={primary}
            disabled={busy || !durationMs}
            onClick={() => {
              const closedAt = new Date();
              const openedAt = new Date(closedAt.getTime() - (durationMs ?? 0));
              send(
                "POST",
                "/api/downtime",
                {
                  equipmentId,
                  cause,
                  notes,
                  openedAt: openedAt.toISOString(),
                  closedAt: closedAt.toISOString(),
                },
                "Logged. Thanks — the downtime is recorded.",
              );
            }}
          >
            {busy ? "Logging…" : "Log it"}
          </button>
          <button className={ghost} onClick={() => setMode("idle")}>Cancel</button>
        </section>
      )}

      {mode === "close" && openEvent && (
        <section className="space-y-3 rounded-xl border border-up/30 bg-up/5 p-4">
          <h2 className="text-[15px] font-medium text-ink">Back in service</h2>
          <label className="block text-[13px] text-ink-secondary">
            Notes (optional)
            <textarea
              className={`${field} mt-1`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What fixed it?"
            />
          </label>
          <button
            className={primary}
            disabled={busy}
            onClick={() => send("PATCH", `/api/downtime/${openEvent.id}`, { close: true, notes }, "Closed. It's back in service.")}
          >
            {busy ? "Closing…" : "Mark it back in service"}
          </button>
          <button className={ghost} onClick={() => setMode("idle")}>Cancel</button>
        </section>
      )}
    </div>
  );
}
