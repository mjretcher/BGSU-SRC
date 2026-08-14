import type { DowntimeEvent } from "@/generated/prisma/client";

// A downtime interval clipped to a reporting period. Open events clip to now.
function clippedMs(ev: Pick<DowntimeEvent, "openedAt" | "closedAt">, start: Date, end: Date): number {
  const s = Math.max(ev.openedAt.getTime(), start.getTime());
  const e = Math.min((ev.closedAt ?? new Date()).getTime(), end.getTime());
  return Math.max(0, e - s);
}

export interface EquipmentMetrics {
  downtimeMs: number;
  downtimePct: number; // 0-100 over the period
  daysDown: number;
  eventCount: number;
  closedCount: number;
  mttrMs: number | null; // mean time to repair (closed events in period)
  mtbfMs: number | null; // mean time between failures
  repairCost: number; // events opened in period
}

export function computeMetrics(
  events: Pick<DowntimeEvent, "openedAt" | "closedAt" | "repairCost">[],
  start: Date,
  end: Date,
): EquipmentMetrics {
  const periodMs = Math.max(1, end.getTime() - start.getTime());
  const inPeriod = events.filter((e) => clippedMs(e, start, end) > 0);
  const downtimeMs = inPeriod.reduce((acc, e) => acc + clippedMs(e, start, end), 0);

  const closed = events
    .filter((e) => e.closedAt && e.closedAt >= start && e.closedAt <= end)
    .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  const mttrMs = closed.length
    ? closed.reduce((acc, e) => acc + (e.closedAt!.getTime() - e.openedAt.getTime()), 0) / closed.length
    : null;

  // MTBF: gaps between one event's close and the next event's open, within period
  const ordered = [...events].sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const prevClose = ordered[i - 1].closedAt;
    if (!prevClose) continue;
    const gap = ordered[i].openedAt.getTime() - prevClose.getTime();
    if (gap > 0 && ordered[i].openedAt >= start && ordered[i].openedAt <= end) gaps.push(gap);
  }
  const mtbfMs = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;

  const repairCost = events
    .filter((e) => e.openedAt >= start && e.openedAt <= end)
    .reduce((acc, e) => acc + Number(e.repairCost ?? 0), 0);

  return {
    downtimeMs,
    downtimePct: (downtimeMs / periodMs) * 100,
    daysDown: downtimeMs / 86_400_000,
    eventCount: inPeriod.length,
    closedCount: closed.length,
    mttrMs,
    mtbfMs,
    repairCost,
  };
}

// The 5% auto-flag always runs on a trailing 12-month window (spec §7),
// regardless of the report period being viewed.
export function trailing12mFlag(
  events: Pick<DowntimeEvent, "openedAt" | "closedAt" | "repairCost">[],
  threshold = 5,
): { flagged: boolean; pct: number } {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const m = computeMetrics(events, start, end);
  return { flagged: m.downtimePct >= threshold, pct: m.downtimePct };
}

export function fmtDuration(ms: number | null): string {
  if (ms === null) return "—";
  const days = ms / 86_400_000;
  if (days >= 1) return `${days.toFixed(1)}d`;
  const hours = ms / 3_600_000;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  return `${Math.round(ms / 60_000)}m`;
}

export function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export type PeriodKey = "week" | "month" | "ytd" | "year";

export function periodRange(key: PeriodKey, now = new Date()): { start: Date; end: Date; label: string } {
  const end = now;
  switch (key) {
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end, label: "Past 7 days" };
    }
    case "month": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { start, end, label: "Past 30 days" };
    }
    case "ytd": {
      return { start: new Date(now.getFullYear(), 0, 1), end, label: `${now.getFullYear()} year to date` };
    }
    case "year": {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return { start, end, label: "Trailing 12 months" };
    }
  }
}
