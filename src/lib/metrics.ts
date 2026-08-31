import type { DowntimeEvent } from "@/generated/prisma/client";

/**
 * Group rows by key.
 *
 * The three call sites that group downtime events by equipment each did
 * `map.set(k, [...(map.get(k) ?? []), row])`, rebuilding the whole array once
 * per row — quadratic in the number of events on a single machine. Pushing into
 * the existing array is the same code path without the copying.
 */
export function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/**
 * Prisma filter selecting events that overlap [start, end].
 *
 * Fleet and alert queries used to fetch every downtime event ever recorded on
 * every page view, when nothing needs more than the reporting window. Filtering
 * on openedAt alone would be wrong in the other direction: an event opened
 * before the window and still open covers all of it, which is exactly the
 * long-running outage worth reporting. An open event has no closedAt, so it
 * overlaps whenever it began before the window ends.
 */
export function overlappingPeriod(start: Date, end: Date) {
  return {
    openedAt: { lte: end },
    OR: [{ closedAt: null }, { closedAt: { gte: start } }],
  };
}

type Span = { start: number; end: number };

// An event's wall-clock span. Open events run to `now`.
function spanOf(ev: Pick<DowntimeEvent, "openedAt" | "closedAt">, now: number): Span {
  return { start: ev.openedAt.getTime(), end: ev.closedAt?.getTime() ?? now };
}

// How much of a span falls inside a reporting period.
function clip(sp: Span, start: number, end: number): number {
  return Math.max(0, Math.min(sp.end, end) - Math.max(sp.start, start));
}

// Collapse events into non-overlapping outage intervals.
//
// Two events covering the same wall-clock time are ONE outage, not two. Summing
// their spans separately double-counts the downtime: two identical 12h events in
// a 24h period reported 100%, three reported 150%, even though downtimePct is
// documented as 0-100 and feeds the 5% auto-flag, the exports, and the alert
// sweep. Overlaps are reachable whenever a quick-log or a backdated close
// describes a window another event already covers, and they also appear if two
// open events ever coexist on one machine.
//
// Merging also repairs MTBF: the old gap loop compared each event to the one
// before it by open time, so an overlapping pair produced a negative gap that
// was silently skipped and MTBF collapsed to null. Gaps between merged outages
// are real uptime.
function mergeOutages(events: Pick<DowntimeEvent, "openedAt" | "closedAt">[], now: number): Span[] {
  const spans = events
    .map((ev) => spanOf(ev, now))
    .filter((sp) => sp.end > sp.start) // zero-length and malformed spans contribute nothing
    .sort((a, b) => a.start - b.start);

  const merged: Span[] = [];
  for (const sp of spans) {
    const last = merged[merged.length - 1];
    if (last && sp.start <= last.end) last.end = Math.max(last.end, sp.end);
    else merged.push({ ...sp });
  }
  return merged;
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
  now: Date = new Date(),
): EquipmentMetrics {
  const s = start.getTime();
  const e = end.getTime();
  const nowMs = now.getTime();
  const periodMs = Math.max(1, e - s);

  // Sum merged outages, not raw events, so overlapping records can't be counted
  // twice. Merged intervals clipped to the period can never exceed the period,
  // which is what keeps downtimePct within 0-100 by construction.
  const outages = mergeOutages(events, nowMs);
  const downtimeMs = outages.reduce((acc, sp) => acc + clip(sp, s, e), 0);

  // eventCount stays a count of records that touch the period — two reports of
  // the same outage are still two tickets, even though they are one outage.
  const inPeriod = events.filter((ev) => clip(spanOf(ev, nowMs), s, e) > 0);

  const closed = events
    .filter((ev) => ev.closedAt && ev.closedAt >= start && ev.closedAt <= end)
    .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  const mttrMs = closed.length
    ? closed.reduce((acc, ev) => acc + (ev.closedAt!.getTime() - ev.openedAt.getTime()), 0) / closed.length
    : null;

  // MTBF: real uptime between distinct outages, measured on the merged
  // intervals so an overlapping pair reads as one failure rather than as a
  // negative gap that gets dropped.
  const gaps: number[] = [];
  for (let i = 1; i < outages.length; i++) {
    const gap = outages[i].start - outages[i - 1].end;
    if (gap > 0 && outages[i].start >= s && outages[i].start <= e) gaps.push(gap);
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
  now: Date = new Date(),
): { flagged: boolean; pct: number } {
  const end = now;
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const m = computeMetrics(events, start, end, now);
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

// Deterministic date formatting: explicit locale + timezone so server-rendered
// HTML matches the client during hydration regardless of system defaults.
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const DATETIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function fmtDate(d: Date): string {
  return DATE_FMT.format(d);
}

export function fmtDateTime(d: Date): string {
  return DATETIME_FMT.format(d);
}
