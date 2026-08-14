import type { EquipmentStatus, CauseCategory, IconCategory, BuildingLevel, ManualMatch } from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<EquipmentStatus, string> = {
  IN_SERVICE: "In Service",
  DOWN_REPORTED: "Down – Reported / Diagnosing",
  DOWN_PARTS_ORDERED: "Down – Parts Ordered",
  DOWN_AWAITING_VENDOR: "Down – Awaiting Vendor/Technician",
  DOWN_SCHEDULED: "Down – Scheduled for Repair",
  DOWN_AWAITING_REPLACEMENT: "Down – Awaiting Replacement Decision",
  RETIRED: "Retired / Permanently Removed",
};

export const STATUS_SHORT: Record<EquipmentStatus, string> = {
  IN_SERVICE: "In Service",
  DOWN_REPORTED: "Diagnosing",
  DOWN_PARTS_ORDERED: "Parts Ordered",
  DOWN_AWAITING_VENDOR: "Awaiting Vendor",
  DOWN_SCHEDULED: "Repair Scheduled",
  DOWN_AWAITING_REPLACEMENT: "Replacement Review",
  RETIRED: "Retired",
};

export const DOWN_STATUSES: EquipmentStatus[] = [
  "DOWN_REPORTED",
  "DOWN_PARTS_ORDERED",
  "DOWN_AWAITING_VENDOR",
  "DOWN_SCHEDULED",
  "DOWN_AWAITING_REPLACEMENT",
];

export function isDown(s: EquipmentStatus): boolean {
  return DOWN_STATUSES.includes(s);
}

// Visual grouping: red = needs action/unknown, amber = in motion, green = up.
export type StatusTone = "up" | "warn" | "down" | "retired";

export const STATUS_TONE: Record<EquipmentStatus, StatusTone> = {
  IN_SERVICE: "up",
  DOWN_REPORTED: "down",
  DOWN_PARTS_ORDERED: "warn",
  DOWN_AWAITING_VENDOR: "warn",
  DOWN_SCHEDULED: "warn",
  DOWN_AWAITING_REPLACEMENT: "down",
  RETIRED: "retired",
};

export const TONE_COLOR: Record<StatusTone, string> = {
  up: "var(--status-up)",
  warn: "var(--status-warn)",
  down: "var(--status-down)",
  retired: "var(--status-retired)",
};

export const TONE_GLOW: Record<StatusTone, string> = {
  up: "var(--status-up-glow)",
  warn: "var(--status-warn-glow)",
  down: "var(--status-down-glow)",
  retired: "transparent",
};

export const CAUSE_LABEL: Record<CauseCategory, string> = {
  MOTOR_MECHANICAL: "Motor / Mechanical",
  BELT_DRIVE_CHAIN: "Belt / Drive / Chain",
  ELECTRICAL_POWER: "Electrical / Power",
  ELECTRONICS: "Electronics (console/display/sensors)",
  SOFTWARE_FIRMWARE: "Software / Firmware",
  HYDRAULIC_PNEUMATIC: "Hydraulic / Pneumatic",
  CABLE_PULLEY: "Cable / Pulley",
  FRAME_STRUCTURAL: "Frame / Structural",
  VANDALISM_MISUSE: "Vandalism / Misuse",
  UNKNOWN_OTHER: "Unknown / Other",
};

export const ICON_LABEL: Record<IconCategory, string> = {
  TREADMILL: "Treadmill",
  ELLIPTICAL: "Elliptical",
  BIKE: "Bike",
  ROWER_SKI: "Rower / Ski Erg",
  STAIR_CLIMBER: "Stair / Climber",
  ARC_TRAINER: "Arc Trainer",
  CURVED_TREADMILL: "Curved Treadmill",
  BENCH: "Bench",
  RACK_SMITH: "Rack / Smith / Hack",
  LEG_MACHINE: "Leg Machine",
  CABLE_PULLEY: "Cable / Pulley",
  SELECTORIZED_UPPER: "Upper Body Machine",
  DUMBBELL_RACK: "Dumbbell / Weight Rack",
  FUNCTIONAL_TOOL: "Functional Training",
  SPECIALTY: "Specialty",
};

export const LEVEL_LABEL: Record<BuildingLevel, string> = {
  ENTRY: "Entry Level",
  BALCONY: "Balcony",
  LOWER_2: "Lower Level II",
};

export const MANUAL_MATCH_LABEL: Record<ManualMatch, string> = {
  EXACT: "Exact match",
  LIKELY: "Likely match — code discrepancy",
  NOT_FOUND: "No manual found",
  NEEDS_NAMEPLATE: "Needs nameplate check",
  UNREVIEWED: "Not yet researched",
};
