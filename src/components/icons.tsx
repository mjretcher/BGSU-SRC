import type { IconCategory } from "@/generated/prisma/enums";
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

// ── Equipment category glyphs (original illustrations) ──────────────

export const Treadmill = (p: P) => (
  <Base {...p}>
    <path d="M3 17h14l4-2.2" />
    <path d="M3 17c0 1.4 1.1 2.5 2.5 2.5h9c1.4 0 2.5-1.1 2.5-2.5" />
    <path d="M16 6.5 19.5 5" />
    <path d="M16 6.5v7.8" />
    <circle cx="5.5" cy="17" r="0.01" />
  </Base>
);

export const CurvedTreadmill = (p: P) => (
  <Base {...p}>
    <path d="M3 14c2.5 3 6 4.5 9 4.5s6.5-1.5 9-4.5" />
    <path d="M4.5 18.5c2 1.5 4.8 2.3 7.5 2.3s5.5-.8 7.5-2.3" />
    <path d="M17 4v6.5" />
    <path d="M17 4l3.5-1" />
  </Base>
);

export const Elliptical = (p: P) => (
  <Base {...p}>
    <circle cx="7" cy="18" r="2.6" />
    <path d="M7 18 12.5 8l4 3 3-6" />
    <path d="M12.5 8l4.5 10" />
    <path d="M9.5 20.6h10" />
  </Base>
);

export const Bike = (p: P) => (
  <Base {...p}>
    <circle cx="6.5" cy="16.5" r="3.4" />
    <circle cx="17.5" cy="16.5" r="3.4" />
    <path d="M6.5 16.5 10 9h5" />
    <path d="M17.5 16.5 14.5 9" />
    <path d="M10 9 13 16.5" />
    <path d="M9 6.8h2.5" />
  </Base>
);

export const RowerSki = (p: P) => (
  <Base {...p}>
    <path d="M2.5 18.5h19" />
    <path d="M5 18.5v-3" />
    <path d="M5 13.5 8.5 15.5 13 12" />
    <circle cx="14.5" cy="9.5" r="1.6" />
    <path d="M13 12l5-1.5 3.5 3" />
  </Base>
);

export const StairClimber = (p: P) => (
  <Base {...p}>
    <path d="M4 20h4v-4h4v-4h4V8h4" />
    <path d="M4 20 20 4" opacity={0.4} />
  </Base>
);

export const ArcTrainer = (p: P) => (
  <Base {...p}>
    <path d="M3 16a10 8 0 0 1 18 0" />
    <path d="M6.5 16v3.5M17.5 16v3.5" />
    <path d="M12 8V4.5" />
    <path d="M10 4.5h4" />
  </Base>
);

export const Bench = (p: P) => (
  <Base {...p}>
    <path d="M3.5 13 15 9.5" />
    <path d="M15 9.5h5.5" />
    <path d="M7 13.8V19M17.5 9.8V19" />
    <path d="M4.5 19h16" opacity={0.4} />
  </Base>
);

export const RackSmith = (p: P) => (
  <Base {...p}>
    <path d="M6 21V4M18 21V4" />
    <path d="M4.5 4h3M16.5 4h3" />
    <path d="M3 10.5h18" />
    <circle cx="5" cy="10.5" r="1.7" />
    <circle cx="19" cy="10.5" r="1.7" />
  </Base>
);

export const LegMachine = (p: P) => (
  <Base {...p}>
    <path d="M4 20 9 14l5 1.5" />
    <path d="M14 15.5 18.5 9" />
    <path d="M17 6.5l3.5 2.5" />
    <circle cx="19.5" cy="4.5" r="1.6" />
    <path d="M4 20h16" opacity={0.4} />
  </Base>
);

export const CablePulley = (p: P) => (
  <Base {...p}>
    <path d="M5 3v18M19 3v18" />
    <circle cx="12" cy="6" r="1.8" />
    <path d="M12 7.8v4" />
    <path d="M8.5 21v-6l3.5-3.2L15.5 15v6" />
  </Base>
);

export const SelectorizedUpper = (p: P) => (
  <Base {...p}>
    <path d="M5 21V6" />
    <rect x="3.5" y="9" width="3" height="8" rx="0.8" fill="currentColor" stroke="none" opacity={0.35} />
    <circle cx="14" cy="6" r="1.8" />
    <path d="M14 8v5l-3.5 3v5" />
    <path d="M14 10.5 9 9" />
    <path d="M14 13l4 2.5V21" />
  </Base>
);

export const DumbbellRack = (p: P) => (
  <Base {...p}>
    <path d="M4 20V9M20 20V9" />
    <path d="M4 12h16M4 17h16" opacity={0.5} />
    <path d="M7.5 10.2v3.6M10.5 10.2v3.6M13.5 10.2v3.6M16.5 10.2v3.6" />
    <path d="M7.5 15.2v3.6M12 15.2v3.6M16.5 15.2v3.6" />
  </Base>
);

export const FunctionalTool = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" opacity={0.4} />
    <path d="M12 3.5V9M12 15v5.5M3.5 12H9M15 12h5.5" />
    <circle cx="12" cy="12" r="2.2" />
  </Base>
);

export const Specialty = (p: P) => (
  <Base {...p}>
    <path d="M12 3l2.4 5.3 5.6.6-4.2 3.9 1.2 5.7L12 15.6l-5 2.9 1.2-5.7L4 8.9l5.6-.6Z" />
  </Base>
);

export const CATEGORY_ICON: Record<IconCategory, (p: P) => React.ReactElement> = {
  TREADMILL: Treadmill,
  ELLIPTICAL: Elliptical,
  BIKE: Bike,
  ROWER_SKI: RowerSki,
  STAIR_CLIMBER: StairClimber,
  ARC_TRAINER: ArcTrainer,
  CURVED_TREADMILL: CurvedTreadmill,
  BENCH: Bench,
  RACK_SMITH: RackSmith,
  LEG_MACHINE: LegMachine,
  CABLE_PULLEY: CablePulley,
  SELECTORIZED_UPPER: SelectorizedUpper,
  DUMBBELL_RACK: DumbbellRack,
  FUNCTIONAL_TOOL: FunctionalTool,
  SPECIALTY: Specialty,
};

// ── UI glyphs ───────────────────────────────────────────────────────

export const MapIcon = (p: P) => (
  <Base {...p}>
    <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
    <path d="M9 4v14M15 6v14" opacity={0.5} />
  </Base>
);

export const TableIcon = (p: P) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="14.5" rx="1.5" />
    <path d="M3.5 10h17M9.5 10v9.5" opacity={0.6} />
  </Base>
);

export const ChartIcon = (p: P) => (
  <Base {...p}>
    <path d="M4 20V4" opacity={0.5} />
    <path d="M4 20h16" opacity={0.5} />
    <path d="M8 16v-5M12.5 16V7.5M17 16v-3" strokeWidth={2.4} />
  </Base>
);

export const ShieldIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 3.5 19 6v6c0 4.6-3 7.5-7 8.5-4-1-7-3.9-7-8.5V6Z" />
    <path d="m9 11.5 2.2 2.2L15.5 9.5" />
  </Base>
);

export const ScrollIcon = (p: P) => (
  <Base {...p}>
    <path d="M7 4h12v13.5a2.5 2.5 0 0 1-2.5 2.5H6a2 2 0 0 1-2-2V6.5" />
    <path d="M7 4a2 2 0 0 0-3 2.5" />
    <path d="M10 9h6M10 13h6" opacity={0.6} />
  </Base>
);

export const LogoutIcon = (p: P) => (
  <Base {...p}>
    <path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" />
    <path d="m17 8 4 4-4 4M21 12H10" />
  </Base>
);

export const WrenchIcon = (p: P) => (
  <Base {...p}>
    <path d="M20.5 6.5a5 5 0 0 1-6.6 6.6L7 20a2.1 2.1 0 0 1-3-3l6.9-6.9a5 5 0 0 1 6.6-6.6L14 7l3 3Z" />
  </Base>
);

export const PlusIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const XIcon = (p: P) => (
  <Base {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Base>
);

export const BookIcon = (p: P) => (
  <Base {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21Z" />
    <path d="M4 18.5V5.5" />
    <path d="M20 18.5H6.5" opacity={0.6} />
  </Base>
);

export const ClockIcon = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 1.9" />
  </Base>
);

export const LayersIcon = (p: P) => (
  <Base {...p}>
    <path d="m12 3 9 5-9 5-9-5Z" />
    <path d="m3 13 9 5 9-5" opacity={0.55} />
    <path d="m3 17.5 9 5 9-5" opacity={0.3} />
  </Base>
);

export const UsersIcon = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
    <circle cx="17" cy="9.5" r="2.4" opacity={0.6} />
    <path d="M16 14.6c2.3.2 4 1.8 4.5 4.4" opacity={0.6} />
  </Base>
);

export const EyeIcon = (p: P) => (
  <Base {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const EyeOffIcon = (p: P) => (
  <Base {...p}>
    <path d="M4 4l16 16" />
    <path d="M10.6 6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.1 9.5 6.1a17.5 17.5 0 0 1-2.7 3.4M6.6 6.9A16.8 16.8 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1" />
    <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
  </Base>
);

export const UndoIcon = (p: P) => (
  <Base {...p}>
    <path d="M4 10h10a6 6 0 0 1 0 12h-3" />
    <path d="m8 6-4 4 4 4" />
  </Base>
);
