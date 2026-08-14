import type { IconCategory } from "@/generated/prisma/enums";

// Top-down architectural footprints, drawn like furniture symbols on a plan.
// Each glyph is centered on (0,0) in floor-plan pixels (3840x1911 space) so it
// scales and rotates with the drawing. `w`/`h` are the footprint extents used
// by the layout script for spacing.
export const GLYPH_SIZE: Record<IconCategory, { w: number; h: number }> = {
  TREADMILL: { w: 14, h: 30 },
  CURVED_TREADMILL: { w: 16, h: 30 },
  ELLIPTICAL: { w: 12, h: 29 },
  ARC_TRAINER: { w: 14, h: 29 },
  BIKE: { w: 9, h: 19 },
  ROWER_SKI: { w: 9, h: 35 },
  STAIR_CLIMBER: { w: 13, h: 22 },
  BENCH: { w: 9, h: 22 },
  RACK_SMITH: { w: 26, h: 26 },
  LEG_MACHINE: { w: 16, h: 22 },
  CABLE_PULLEY: { w: 46, h: 13 },
  SELECTORIZED_UPPER: { w: 16, h: 19 },
  DUMBBELL_RACK: { w: 35, h: 10 },
  FUNCTIONAL_TOOL: { w: 15, h: 15 },
  SPECIALTY: { w: 13, h: 13 },
};

const DETAIL = "rgba(226,200,170,0.55)";

// Shapes use currentColor for the status-toned outline; callers set `color`.
export function GlyphShape({ category }: { category: IconCategory }) {
  switch (category) {
    case "TREADMILL":
      return (
        <>
          <rect x={-11} y={-26} width={22} height={52} rx={5} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <line x1={-7} y1={-19} x2={7} y2={-19} stroke={DETAIL} strokeWidth={2.2} />
          <rect x={-7} y={-13} width={14} height={34} rx={2.5} fill="none" stroke={DETAIL} strokeWidth={1.6} />
        </>
      );
    case "CURVED_TREADMILL":
      return (
        <>
          <rect x={-13} y={-26} width={26} height={52} rx={7} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <path d="M -8 -14 Q 0 -20 8 -14" fill="none" stroke={DETAIL} strokeWidth={1.8} />
          <path d="M -8 16 Q 0 10 8 16" fill="none" stroke={DETAIL} strokeWidth={1.8} />
        </>
      );
    case "ELLIPTICAL":
      return (
        <>
          <rect x={-10} y={-24} width={20} height={48} rx={9} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <circle cx={0} cy={-13} r={4} fill="none" stroke={DETAIL} strokeWidth={1.8} />
          <line x1={-5} y1={4} x2={5} y2={4} stroke={DETAIL} strokeWidth={2} />
          <line x1={-5} y1={12} x2={5} y2={12} stroke={DETAIL} strokeWidth={2} />
        </>
      );
    case "ARC_TRAINER":
      return (
        <>
          <rect x={-12} y={-25} width={24} height={50} rx={10} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <path d="M -7 -12 A 9 9 0 0 1 7 -12" fill="none" stroke={DETAIL} strokeWidth={1.8} />
          <line x1={-6} y1={8} x2={6} y2={8} stroke={DETAIL} strokeWidth={2} />
        </>
      );
    case "BIKE":
      return (
        <>
          <rect x={-8} y={-17} width={16} height={34} rx={7} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <line x1={-5} y1={-9} x2={5} y2={-9} stroke={DETAIL} strokeWidth={2.2} />
          <circle cx={0} cy={7} r={3.5} fill="none" stroke={DETAIL} strokeWidth={1.6} />
        </>
      );
    case "ROWER_SKI":
      return (
        <>
          <rect x={-4} y={-29} width={8} height={58} rx={4} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <rect x={-7} y={-4} width={14} height={9} rx={2} fill="none" stroke={DETAIL} strokeWidth={1.6} />
          <circle cx={0} cy={-22} r={3} fill="none" stroke={DETAIL} strokeWidth={1.6} />
        </>
      );
    case "STAIR_CLIMBER":
      return (
        <>
          <rect x={-12} y={-17} width={24} height={34} rx={4} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <line x1={-6} y1={-8} x2={6} y2={-8} stroke={DETAIL} strokeWidth={1.7} />
          <line x1={-6} y1={-1} x2={6} y2={-1} stroke={DETAIL} strokeWidth={1.7} />
          <line x1={-6} y1={6} x2={6} y2={6} stroke={DETAIL} strokeWidth={1.7} />
        </>
      );
    case "BENCH":
      return (
        <>
          <rect x={-5} y={-20} width={10} height={40} rx={4} fill="currentColor" fillOpacity={0.16} stroke="currentColor" strokeWidth={2.4} />
          <line x1={-8} y1={-14} x2={8} y2={-14} stroke="currentColor" strokeWidth={2.4} />
        </>
      );
    case "RACK_SMITH":
      return (
        <>
          <rect x={-20} y={-20} width={40} height={40} rx={3} fill="currentColor" fillOpacity={0.09} stroke="currentColor" strokeWidth={2.6} />
          <circle cx={-15} cy={-15} r={2.6} fill="currentColor" />
          <circle cx={15} cy={-15} r={2.6} fill="currentColor" />
          <circle cx={-15} cy={15} r={2.6} fill="currentColor" />
          <circle cx={15} cy={15} r={2.6} fill="currentColor" />
          <line x1={-19} y1={0} x2={19} y2={0} stroke={DETAIL} strokeWidth={2} />
        </>
      );
    case "LEG_MACHINE":
      return (
        <>
          <rect x={-13} y={-17} width={26} height={34} rx={5} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <rect x={-6} y={-10} width={12} height={10} rx={2.5} fill="none" stroke={DETAIL} strokeWidth={1.7} />
          <line x1={-8} y1={9} x2={8} y2={9} stroke={DETAIL} strokeWidth={2} />
        </>
      );
    case "CABLE_PULLEY":
      return (
        <>
          <rect x={-22} y={-10} width={44} height={20} rx={4} fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth={2.4} />
          <rect x={-20} y={-8} width={9} height={16} rx={2} fill="currentColor" fillOpacity={0.25} stroke="none" />
          <rect x={11} y={-8} width={9} height={16} rx={2} fill="currentColor" fillOpacity={0.25} stroke="none" />
          <line x1={-9} y1={0} x2={9} y2={0} stroke={DETAIL} strokeWidth={1.7} />
        </>
      );
    case "SELECTORIZED_UPPER":
      return (
        <>
          <rect x={-13} y={-15} width={26} height={30} rx={5} fill="currentColor" fillOpacity={0.14} stroke="currentColor" strokeWidth={2.4} />
          <circle cx={0} cy={2} r={4.5} fill="none" stroke={DETAIL} strokeWidth={1.7} />
          <rect x={-10} y={-12} width={20} height={5} rx={2} fill="currentColor" fillOpacity={0.28} stroke="none" />
        </>
      );
    case "DUMBBELL_RACK":
      return (
        <>
          <rect x={-26} y={-8} width={52} height={16} rx={3} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={2.4} />
          {[-18, -9, 0, 9, 18].map((x) => (
            <line key={x} x1={x} y1={-5} x2={x} y2={5} stroke={DETAIL} strokeWidth={2} />
          ))}
        </>
      );
    case "FUNCTIONAL_TOOL":
      return (
        <>
          <circle cx={0} cy={0} r={12} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={2.4} />
          <circle cx={0} cy={0} r={4} fill="none" stroke={DETAIL} strokeWidth={1.7} />
        </>
      );
    case "SPECIALTY":
      return (
        <>
          <rect x={-11} y={-11} width={22} height={22} rx={5} transform="rotate(45)" fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={2.4} />
        </>
      );
  }
}
