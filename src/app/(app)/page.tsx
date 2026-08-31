import { db } from "@/lib/db";
import { trailing12mFlag, groupBy, overlappingPeriod } from "@/lib/metrics";
import { STATUS_TONE } from "@/lib/status";
import { MapScreen } from "@/components/map/MapScreen";
import type { MapEquipment } from "@/components/map/FacilityMap";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const now = new Date();
  const flagStart = new Date(now);
  flagStart.setFullYear(flagStart.getFullYear() - 1);

  const [equipment, recentEvents] = await Promise.all([
    db.equipment.findMany({
      select: {
        id: true, itemId: true, name: true, brand: true, level: true,
        mapX: true, mapY: true, iconCategory: true, status: true,
      },
      orderBy: { itemId: "asc" },
    }),
    db.downtimeEvent.findMany({
      // The flag is a trailing-12-month measure, so that is the window to
      // fetch. Filtering on openedAt alone (as a flat 400-day cutoff did)
      // drops an outage that began earlier and is still open — the longest
      // outages, and the ones most worth flagging.
      where: overlappingPeriod(flagStart, now),
      select: { equipmentId: true, openedAt: true, closedAt: true, repairCost: true },
    }),
  ]);

  const eventsByEquipment = groupBy(recentEvents, (ev) => ev.equipmentId);

  const list: MapEquipment[] = equipment.map((e) => ({
    id: e.id,
    itemId: e.itemId,
    name: e.name,
    brand: e.brand,
    level: e.level,
    mapX: e.mapX ?? 0.5,
    mapY: e.mapY ?? 0.5,
    iconCategory: e.iconCategory,
    status: e.status,
    flagged: trailing12mFlag(eventsByEquipment.get(e.id) ?? [], 5, now).flagged,
  }));

  const counts = {
    total: list.length,
    up: list.filter((e) => STATUS_TONE[e.status] === "up").length,
    warn: list.filter((e) => STATUS_TONE[e.status] === "warn").length,
    down: list.filter((e) => STATUS_TONE[e.status] === "down").length,
    flagged: list.filter((e) => e.flagged).length,
  };

  return <MapScreen equipment={list} counts={counts} />;
}
