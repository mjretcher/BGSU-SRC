import { FLOORPLANS, CROP, type LevelKey, type ZoneClass } from "@/data/floorplans";

// Zone rendering styles on the dark ops canvas. Fitness zones (where the
// equipment lives) get the accent treatment; everything else reads as
// architectural context.
// Colors keyed to the actual facility: brown rubber fitness floors with BGSU
// orange zone accents (matching BGSU's own floor-plan legend), wood-tone
// courts, blue pool, warm neutral support spaces.
const ZONE_STYLE: Partial<Record<ZoneClass, { fill: string; stroke: string; strokeWidth?: number }>> = {
  fitness: { fill: "rgba(254,80,0,0.10)", stroke: "rgba(254,80,0,0.55)", strokeWidth: 3 },
  courts: { fill: "rgba(222,184,135,0.07)", stroke: "rgba(222,184,135,0.25)" },
  lounge: { fill: "rgba(214,186,155,0.04)", stroke: "rgba(214,186,155,0.13)" },
  multi: { fill: "rgba(214,186,155,0.06)", stroke: "rgba(214,186,155,0.2)" },
  offices: { fill: "rgba(214,186,155,0.05)", stroke: "rgba(214,186,155,0.16)" },
  pool: { fill: "rgba(125,211,252,0.06)", stroke: "rgba(125,211,252,0.22)" },
  locker: { fill: "rgba(214,186,155,0.05)", stroke: "rgba(214,186,155,0.16)" },
  restroom: { fill: "rgba(214,186,155,0.05)", stroke: "rgba(214,186,155,0.16)" },
};

export function LevelSvg({ level, id }: { level: LevelKey; id?: string }) {
  const plan = FLOORPLANS[level];
  return (
    <svg
      id={id}
      viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={`floor-dots-${level}`} width="36" height="36" patternUnits="userSpaceOnUse">
          <circle cx="18" cy="18" r="1.6" fill="rgba(226,200,170,0.09)" />
        </pattern>
        <clipPath id={`sil-clip-${level}`}>
          {plan.silhouette?.map((pts, i) => (
            <polygon key={i} points={pts.map((p) => p.join(",")).join(" ")} />
          ))}
        </clipPath>
      </defs>
      {plan.silhouette?.map((pts, i) => (
        <polygon
          key={`sil-${i}`}
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="rgba(41,30,23,0.88)"
          stroke="rgba(226,200,170,0.32)"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      ))}
      {/* subtle floor texture inside the building footprint */}
      <rect
        x={CROP.x}
        y={CROP.y}
        width={CROP.w}
        height={CROP.h}
        fill={`url(#floor-dots-${level})`}
        clipPath={`url(#sil-clip-${level})`}
      />
      {(Object.keys(ZONE_STYLE) as ZoneClass[]).map((cls) =>
        (plan[cls] ?? []).map((pts, i) => {
          const s = ZONE_STYLE[cls]!;
          return (
            <polygon
              key={`${cls}-${i}`}
              points={pts.map((p) => p.join(",")).join(" ")}
              fill={s.fill}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth ?? 2}
              strokeLinejoin="round"
            />
          );
        }),
      )}
    </svg>
  );
}
