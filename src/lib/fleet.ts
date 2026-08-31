import { db } from "./db";
import {
  computeMetrics, trailing12mFlag, periodRange, groupBy, overlappingPeriod,
  type PeriodKey, type EquipmentMetrics,
} from "./metrics";

export interface FleetRow {
  id: string;
  itemId: string;
  name: string;
  brand: string;
  model: string | null;
  level: string;
  zone: string;
  status: string;
  iconCategory: string;
  warrantyExpiresAt: Date | null;
  metrics: EquipmentMetrics;
  flagged: boolean;
  flagPct: number;
}

export async function fleetMetrics(period: PeriodKey): Promise<{ rows: FleetRow[]; start: Date; end: Date; label: string }> {
  const { start, end, label } = periodRange(period);

  // Two windows are in play: the chosen reporting period, and the trailing 12
  // months the 5% flag always uses regardless of that period. Fetch their union
  // rather than the entire event history, which is what this did before and
  // grew without bound as the log accumulated.
  const flagStart = new Date(end);
  flagStart.setFullYear(flagStart.getFullYear() - 1);
  const windowStart = start < flagStart ? start : flagStart;
  const windowEnd = end;

  const [equipment, events] = await Promise.all([
    db.equipment.findMany({ orderBy: { itemId: "asc" } }),
    db.downtimeEvent.findMany({
      where: overlappingPeriod(windowStart, windowEnd),
      select: { equipmentId: true, openedAt: true, closedAt: true, repairCost: true },
    }),
  ]);
  const byEquipment = groupBy(events, (ev) => ev.equipmentId);
  const rows: FleetRow[] = equipment.map((e) => {
    const evs = byEquipment.get(e.id) ?? [];
    // `end` is the period's now; passing it keeps the flag window identical to
    // the window the events were fetched for.
    const flag = trailing12mFlag(evs, 5, end);
    return {
      id: e.id,
      itemId: e.itemId,
      name: e.name,
      brand: e.brand,
      model: e.model,
      level: e.level,
      zone: e.zone,
      status: e.status,
      iconCategory: e.iconCategory,
      warrantyExpiresAt: e.warrantyExpiresAt,
      metrics: computeMetrics(evs, start, end, end),
      flagged: flag.flagged,
      flagPct: flag.pct,
    };
  });
  return { rows, start, end, label };
}
