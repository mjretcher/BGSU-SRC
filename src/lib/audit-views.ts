// Dragging pins around the 3D map writes an audit row per drop, and undo writes
// another, so a single arrange session buries the entries this log exists for —
// status changes, downtime, deletions, logins — under dozens of cosmetic moves.
// The rows are still recorded, since where a pin sat is legitimate history; they
// just no longer share a view with everything else by default.
export const LAYOUT_ACTIONS = ["equipment.pin_moved"];

export type AuditView = "ops" | "layout" | "all";

export const AUDIT_VIEWS: { key: AuditView; label: string; hint: string }[] = [
  { key: "ops", label: "Operations", hint: "Everything except map layout changes" },
  { key: "layout", label: "Layout changes", hint: "Pin moves on the floor map" },
  { key: "all", label: "Everything", hint: "Unfiltered" },
];

/** Anything unrecognised falls back to the operations view. */
export function parseAuditView(raw: string | undefined): AuditView {
  return raw === "layout" || raw === "all" ? raw : "ops";
}

/** Prisma filter for a view. The list view and its count must share this. */
export function auditWhere(view: AuditView) {
  if (view === "layout") return { action: { in: LAYOUT_ACTIONS } };
  if (view === "ops") return { action: { notIn: LAYOUT_ACTIONS } };
  return {};
}
