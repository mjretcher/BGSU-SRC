import { describe, expect, it } from "vitest";
import { computeMetrics, trailing12mFlag } from "./metrics";

// computeMetrics is the one pure function the whole product rests on: its
// downtimePct drives the 5% auto-flag (spec §7), the fleet table, the PDF and
// Excel exports, the reports page and the nightly alert sweep. It takes plain
// data and no database, so it is cheap to pin down exactly.

const HOUR = 3_600_000;
const DAY = 86_400_000;

type Ev = { openedAt: Date; closedAt: Date | null; repairCost: number | null };

const at = (iso: string) => new Date(iso);

/** An event on 2026-08-01, by hour-of-day. `close: null` means still open. */
function ev(openHour: number, closeHour: number | null, repairCost: number | null = null): Ev {
  const h = (n: number) => `2026-08-01T${String(n).padStart(2, "0")}:00:00.000Z`;
  return { openedAt: at(h(openHour)), closedAt: closeHour === null ? null : at(h(closeHour)), repairCost };
}

// computeMetrics is typed against Prisma's DowntimeEvent (repairCost is a
// Decimal). Tests pass plain numbers, so the structural cast lives here only.
type Events = Parameters<typeof computeMetrics>[0];
const metrics = (events: Ev[], start: Date, end: Date, now?: Date) =>
  computeMetrics(events as unknown as Events, start, end, now);

// A 24-hour reporting period, so 1 hour of downtime reads as 4.1667%.
const START = at("2026-08-01T00:00:00.000Z");
const END = at("2026-08-02T00:00:00.000Z");

describe("computeMetrics — downtime totals", () => {
  it("reports a single event's duration", () => {
    const m = metrics([ev(0, 6)], START, END);
    expect(m.downtimeMs).toBe(6 * HOUR);
    expect(m.downtimePct).toBeCloseTo(25);
  });

  it("adds separate outages together", () => {
    const m = metrics([ev(0, 6), ev(12, 18)], START, END);
    expect(m.downtimeMs).toBe(12 * HOUR);
    expect(m.downtimePct).toBeCloseTo(50);
  });

  it("clips an event that starts before the period", () => {
    const m = metrics(
      [{ openedAt: at("2026-07-31T20:00:00.000Z"), closedAt: at("2026-08-01T04:00:00.000Z"), repairCost: null }],
      START,
      END,
    );
    expect(m.downtimeMs).toBe(4 * HOUR); // only the in-period tail counts
  });

  it("ignores an event entirely outside the period", () => {
    const m = metrics(
      [{ openedAt: at("2026-07-01T00:00:00.000Z"), closedAt: at("2026-07-01T06:00:00.000Z"), repairCost: null }],
      START,
      END,
    );
    expect(m.downtimeMs).toBe(0);
    expect(m.eventCount).toBe(0);
  });

  it("bills a still-open event up to now, not to the end of the period", () => {
    const m = metrics([ev(0, null)], START, END, at("2026-08-01T06:00:00.000Z"));
    expect(m.downtimeMs).toBe(6 * HOUR);
  });

  it("treats a malformed event that closes before it opens as zero downtime", () => {
    const m = metrics([ev(8, 4)], START, END);
    expect(m.downtimeMs).toBe(0);
  });
});

// The bug these were written for: downtimeMs summed each event's span
// independently, so two records describing the same outage were counted twice.
// Backdated close and quick-log both let staff enter a window another event
// already covers, which is what makes this reachable in practice.
describe("computeMetrics — overlapping events count once", () => {
  it("counts two identical outages as one", () => {
    const m = metrics([ev(0, 12), ev(0, 12)], START, END);
    expect(m.downtimeMs).toBe(12 * HOUR);
    expect(m.downtimePct).toBeCloseTo(50); // was 100 before the fix
  });

  it("counts a partial overlap once across its union", () => {
    // 00:00-08:00 and 04:00-12:00 together cover 12 hours, not 16.
    const m = metrics([ev(0, 8), ev(4, 12)], START, END);
    expect(m.downtimeMs).toBe(12 * HOUR);
  });

  it("counts a fully contained event once", () => {
    const m = metrics([ev(0, 12), ev(2, 4)], START, END);
    expect(m.downtimeMs).toBe(12 * HOUR);
  });

  it("joins outages that touch end-to-start", () => {
    const m = metrics([ev(0, 6), ev(6, 12)], START, END);
    expect(m.downtimeMs).toBe(12 * HOUR);
  });

  it("merges regardless of the order events arrive in", () => {
    const m = metrics([ev(4, 12), ev(0, 8)], START, END);
    expect(m.downtimeMs).toBe(12 * HOUR);
  });

  it("never lets downtimePct exceed 100", () => {
    // Five records of the same all-day outage: 500% before the fix.
    const m = metrics([ev(0, 12), ev(0, 12), ev(0, 12), ev(0, 12), ev(0, 12)], START, END);
    expect(m.downtimePct).toBeLessThanOrEqual(100);
    expect(m.downtimePct).toBeCloseTo(50);
  });

  it("still counts duplicate records as separate events", () => {
    // Two tickets are two tickets even when they describe one outage — only
    // the *duration* is de-duplicated.
    const m = metrics([ev(0, 12), ev(0, 12)], START, END);
    expect(m.eventCount).toBe(2);
    expect(m.downtimeMs).toBe(12 * HOUR);
  });
});

describe("computeMetrics — MTTR", () => {
  it("averages repair time over events closed in the period", () => {
    const m = metrics([ev(0, 2), ev(8, 12)], START, END);
    expect(m.mttrMs).toBe(3 * HOUR); // (2h + 4h) / 2
  });

  it("is null when nothing closed in the period", () => {
    expect(metrics([ev(0, null)], START, END, at("2026-08-01T06:00:00.000Z")).mttrMs).toBeNull();
  });
});

describe("computeMetrics — MTBF", () => {
  it("measures uptime between distinct outages", () => {
    const m = metrics([ev(0, 2), ev(6, 8)], START, END);
    expect(m.mtbfMs).toBe(4 * HOUR);
  });

  it("averages several gaps", () => {
    const m = metrics([ev(0, 2), ev(6, 8), ev(10, 12)], START, END);
    expect(m.mtbfMs).toBe(3 * HOUR); // gaps of 4h and 2h
  });

  it("reports no gap for overlapping records of one outage", () => {
    // Previously the gap came out negative and was silently dropped, which
    // also produced null — but via a distortion rather than by meaning it.
    expect(metrics([ev(0, 12), ev(0, 12)], START, END).mtbfMs).toBeNull();
  });

  it("does not invent a gap between outages that touch", () => {
    expect(metrics([ev(0, 6), ev(6, 12)], START, END).mtbfMs).toBeNull();
  });
});

describe("computeMetrics — repair cost", () => {
  it("sums cost across events opened in the period", () => {
    expect(metrics([ev(0, 2, 120.5), ev(6, 8, 79.5)], START, END).repairCost).toBe(200);
  });

  it("treats a missing cost as zero", () => {
    expect(metrics([ev(0, 2, null), ev(6, 8, 50)], START, END).repairCost).toBe(50);
  });
});

describe("trailing12mFlag", () => {
  const NOW = at("2026-08-01T00:00:00.000Z");
  const daysDownEndingAt = (days: number): Ev => ({
    openedAt: new Date(NOW.getTime() - days * DAY),
    closedAt: NOW,
    repairCost: null,
  });

  it("flags equipment at or above the 5% threshold", () => {
    // 20 of ~365 days is ~5.5%.
    const r = trailing12mFlag([daysDownEndingAt(20)] as unknown as Events, 5, NOW);
    expect(r.flagged).toBe(true);
    expect(r.pct).toBeGreaterThan(5);
  });

  it("does not flag equipment below the threshold", () => {
    const r = trailing12mFlag([daysDownEndingAt(10)] as unknown as Events, 5, NOW);
    expect(r.flagged).toBe(false);
  });

  it("does not flag on duplicated records that only look like 5%", () => {
    // One 10-day outage recorded three times: ~8.2% before the fix, ~2.7% now.
    const dupes = [daysDownEndingAt(10), daysDownEndingAt(10), daysDownEndingAt(10)];
    const r = trailing12mFlag(dupes as unknown as Events, 5, NOW);
    expect(r.flagged).toBe(false);
  });
});
