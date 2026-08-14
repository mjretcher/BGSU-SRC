import { db } from "@/lib/db";
import { trailing12mFlag } from "@/lib/metrics";
import { STATUS_TONE } from "@/lib/status";
import { MapScreen } from "@/components/map/MapScreen";
import type { MapEquipment } from "@/components/map/FacilityMap";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [equipment, recentEvents] = await Promise.all([
    db.equipment.findMany({
      select: {
        id: true, itemId: true, name: true, brand: true, level: true,
        mapX: true, mapY: true, iconCategory: true, status: true,
      },
      orderBy: { itemId: "asc" },
    }),
    db.downtimeEvent.findMany({
      where: { openedAt: { gte: new Date(Date.now() - 400 * 86_400_000) } },
      select: { equipmentId: true, openedAt: true, closedAt: true, repairCost: true },
    }),
  ]);

  const eventsByEquipment = new Map<string, typeof recentEvents>();
  for (const ev of recentEvents) {
    eventsByEquipment.set(ev.equipmentId, [...(eventsByEquipment.get(ev.equipmentId) ?? []), ev]);
  }

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
    flagged: trailing12mFlag(eventsByEquipment.get(e.id) ?? []).flagged,
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
