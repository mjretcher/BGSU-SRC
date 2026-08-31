import { describe, expect, it } from "vitest";
import { AUDIT_VIEWS, LAYOUT_ACTIONS, auditWhere, parseAuditView } from "./audit-views";

describe("audit views", () => {
  it("defaults to operations, so pin moves are hidden unless asked for", () => {
    expect(parseAuditView(undefined)).toBe("ops");
    expect(parseAuditView("")).toBe("ops");
    expect(parseAuditView("nonsense")).toBe("ops");
  });

  it("accepts the two explicit views", () => {
    expect(parseAuditView("layout")).toBe("layout");
    expect(parseAuditView("all")).toBe("all");
  });

  it("excludes layout actions from the operations view", () => {
    expect(auditWhere("ops")).toEqual({ action: { notIn: LAYOUT_ACTIONS } });
  });

  it("shows only layout actions in the layout view", () => {
    expect(auditWhere("layout")).toEqual({ action: { in: LAYOUT_ACTIONS } });
  });

  it("filters nothing in the everything view", () => {
    expect(auditWhere("all")).toEqual({});
  });

  it("keeps pin moves out of the default view", () => {
    // The whole point: a pin drag must not appear alongside status changes and
    // deletions unless the reader opts in.
    expect(LAYOUT_ACTIONS).toContain("equipment.pin_moved");
  });

  it("offers a view for every filter it can build", () => {
    expect(AUDIT_VIEWS.map((v) => v.key).sort()).toEqual(["all", "layout", "ops"]);
  });
});
