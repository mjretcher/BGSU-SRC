"use client";

import { useState } from "react";

// Shared by the quick-log and backdated-close flows: lets staff say "this was
// down for 5 minutes" without doing unit math themselves. Presets cover the
// "fixed it on the spot" cases from the spec's own framing (a few minutes,
// no parts ordered); "Custom" opens a plain number + unit for anything else,
// down to single minutes and up to multi-day.

const PRESETS: { label: string; ms: number }[] = [
  { label: "5 min", ms: 5 * 60_000 },
  { label: "20 min", ms: 20 * 60_000 },
  { label: "1 hr", ms: 60 * 60_000 },
  { label: "4 hr", ms: 4 * 60 * 60_000 },
  { label: "1 day", ms: 24 * 60 * 60_000 },
];

const UNIT_MS: Record<"minutes" | "hours" | "days", number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

const chipCls = (active: boolean) =>
  `rounded-lg border px-2.5 py-1.5 text-[12.5px] transition ${
    active
      ? "border-accent/50 bg-accent-soft text-accent"
      : "border-line-strong text-ink-secondary hover:border-accent/40 hover:text-ink"
  }`;

export function DurationPicker({ valueMs, onChange }: { valueMs: number | null; onChange: (ms: number | null) => void }) {
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("15");
  const [unit, setUnit] = useState<"minutes" | "hours" | "days">("minutes");

  function applyCustom(nextAmount: string, nextUnit: typeof unit) {
    const n = Number(nextAmount);
    onChange(Number.isFinite(n) && n > 0 ? Math.round(n * UNIT_MS[nextUnit]) : null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={chipCls(!custom && valueMs === p.ms)}
            onClick={() => {
              setCustom(false);
              onChange(p.ms);
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={chipCls(custom)}
          onClick={() => {
            setCustom(true);
            applyCustom(amount, unit);
          }}
        >
          Custom
        </button>
      </div>
      {custom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(ev) => {
              setAmount(ev.target.value);
              applyCustom(ev.target.value, unit);
            }}
            className="w-20 rounded-lg border border-line-strong bg-bg-raised px-2.5 py-1.5 text-sm text-ink outline-none transition focus:border-accent"
          />
          <select
            value={unit}
            onChange={(ev) => {
              const u = ev.target.value as typeof unit;
              setUnit(u);
              applyCustom(amount, u);
            }}
            className="rounded-lg border border-line-strong bg-bg-raised px-2.5 py-1.5 text-sm text-ink outline-none"
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </div>
      )}
    </div>
  );
}
