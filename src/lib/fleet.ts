import { db } from "./db";
import { computeMetrics, trailing12mFlag, periodRange, type PeriodKey, type EquipmentMetrics } from "./metrics";

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
  const [equipment, events] = await Promise.all([
    db.equipment.findMany({ orderBy: { itemId: "asc" } }),
    db.downtimeEvent.findMany({
      select: { equipmentId: true, openedAt: true, closedAt: true, repairCost: true },
    }),
  ]);
  const byEquipment = new Map<string, typeof events>();
  for (const ev of events) {
    byEquipment.set(ev.equipmentId, [...(byEquipment.get(ev.equipmentId) ?? []), ev]);
  }
  const rows: FleetRow[] = equipment.map((e) => {
    const evs = byEquipment.get(e.id) ?? [];
    const flag = trailing12mFlag(evs);
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
      metrics: computeMetrics(evs, start, end),
      flagged: flag.flagged,
      flagPct: flag.pct,
    };
  });
  return { rows, start, end, label };
}
