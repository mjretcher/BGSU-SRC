import { FLOORPLANS, CROP, type LevelKey, type ZoneClass } from "@/data/floorplans";

// Zone rendering styles on the dark ops canvas. Fitness zones (where the
// equipment lives) get the accent treatment; everything else reads as
// architectural context.
const ZONE_STYLE: Partial<Record<ZoneClass, { fill: string; stroke: string; strokeWidth?: number }>> = {
  fitness: { fill: "rgba(45,212,191,0.07)", stroke: "rgba(45,212,191,0.45)", strokeWidth: 3 },
  courts: { fill: "rgba(148,163,184,0.05)", stroke: "rgba(148,163,184,0.18)" },
  lounge: { fill: "rgba(148,163,184,0.03)", stroke: "rgba(148,163,184,0.12)" },
  multi: { fill: "rgba(148,163,184,0.05)", stroke: "rgba(148,163,184,0.18)" },
  offices: { fill: "rgba(148,163,184,0.04)", stroke: "rgba(148,163,184,0.14)" },
  pool: { fill: "rgba(125,211,252,0.05)", stroke: "rgba(125,211,252,0.2)" },
  locker: { fill: "rgba(148,163,184,0.04)", stroke: "rgba(148,163,184,0.14)" },
  restroom: { fill: "rgba(148,163,184,0.04)", stroke: "rgba(148,163,184,0.14)" },
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
          <circle cx="18" cy="18" r="1.6" fill="rgba(148,163,184,0.10)" />
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
          fill="rgba(19,26,38,0.85)"
          stroke="rgba(148,163,184,0.35)"
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
