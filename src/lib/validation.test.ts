import { describe, expect, it } from "vitest";
import {
  createEquipmentSchema,
  createMaintenanceSchema,
  createUserSchema,
  loginSchema,
  openDowntimeSchema,
  updateDowntimeSchema,
  updateEquipmentSchema,
} from "./validation";

// These routes previously read JSON straight into a hand-written type and
// handed the values to Prisma, so a wrong type reached the driver and surfaced
// as an unhandled throw — a 500 where the caller deserved a 400.

const ok = <T>(r: { success: boolean; data?: T }) => {
  expect(r.success).toBe(true);
  return r.data as T;
};
const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) => {
  expect(r.success).toBe(false);
  return r.error!.issues.map((i) => i.message).join("; ");
};

describe("equipment update (PATCH)", () => {
  // The property the route depends on completely: a PATCH must never clear a
  // field the caller did not mention.
  it("returns only the keys the caller sent", () => {
    const data = ok(updateEquipmentSchema.safeParse({ name: "Treadmill 4" }));
    expect(Object.keys(data)).toEqual(["name"]);
  });

  it("keeps an explicit null as an intentional clear", () => {
    expect(ok(updateEquipmentSchema.safeParse({ model: null }))).toEqual({ model: null });
  });

  it("treats a blank string as a clear, the way the column stores it", () => {
    expect(ok(updateEquipmentSchema.safeParse({ model: "   " }))).toEqual({ model: null });
  });

  it("accepts an in-range map coordinate", () => {
    expect(ok(updateEquipmentSchema.safeParse({ mapX: 0.42 }))).toEqual({ mapX: 0.42 });
  });

  it("rejects a map coordinate outside the floorplan", () => {
    // mapX/mapY are 0-1 fractions; 47 puts a pin where nothing can reach it.
    expect(messages(updateEquipmentSchema.safeParse({ mapX: 47 }))).toMatch(/<=1/);
    expect(messages(updateEquipmentSchema.safeParse({ mapY: -1 }))).toMatch(/>=0/);
  });

  it("rejects an unknown enum value by name", () => {
    expect(messages(updateEquipmentSchema.safeParse({ level: "BASEMENT" }))).toContain("ENTRY");
  });

  it("rejects a negative cost", () => {
    expect(messages(updateEquipmentSchema.safeParse({ cost: -5 }))).toMatch(/0 or more/);
  });

  it("accepts a numeric string, since forms submit strings", () => {
    expect(ok(updateEquipmentSchema.safeParse({ cost: "249.99" }))).toEqual({ cost: 249.99 });
  });

  it("rejects an unparseable date", () => {
    expect(messages(updateEquipmentSchema.safeParse({ purchaseDate: "not-a-date" }))).toMatch(/valid date/);
  });

  it("ignores fields that are not editable", () => {
    // status and itemId are not in the schema, so they cannot be smuggled in.
    const data = ok(updateEquipmentSchema.safeParse({ name: "x", status: "RETIRED", itemId: "STOLEN" }));
    expect(data).toEqual({ name: "x" });
  });
});

describe("equipment create (POST)", () => {
  it("names every missing required field at once", () => {
    const m = messages(createEquipmentSchema.safeParse({ name: "Rower" }));
    expect(m).toMatch(/Item ID is required/);
    expect(m).toMatch(/Brand is required/);
    expect(m).toMatch(/Zone is required/);
  });

  it("rejects a non-object body instead of throwing", () => {
    expect(createEquipmentSchema.safeParse(null).success).toBe(false);
    expect(createEquipmentSchema.safeParse("nope").success).toBe(false);
  });

  it("trims the required strings", () => {
    const d = ok(
      createEquipmentSchema.safeParse({
        itemId: "  A1 ", name: " Rower ", brand: " Concept2 ", level: "ENTRY", zone: " Cardio ",
      }),
    );
    expect([d.itemId, d.name, d.brand, d.zone]).toEqual(["A1", "Rower", "Concept2", "Cardio"]);
  });

  it("rejects whitespace-only values for required fields", () => {
    const m = messages(
      createEquipmentSchema.safeParse({ itemId: "   ", name: "x", brand: "y", level: "ENTRY", zone: "z" }),
    );
    expect(m).toMatch(/Item ID is required/);
  });
});

describe("downtime open (POST)", () => {
  it("requires an equipmentId", () => {
    expect(messages(openDowntimeSchema.safeParse({}))).toMatch(/equipmentId is required/);
  });

  it("rejects a close time at or before the open time", () => {
    const base = { equipmentId: "e1", openedAt: "2026-08-01T10:00:00Z" };
    expect(messages(openDowntimeSchema.safeParse({ ...base, closedAt: "2026-08-01T09:00:00Z" })))
      .toMatch(/closedAt must be after openedAt/);
    expect(messages(openDowntimeSchema.safeParse({ ...base, closedAt: "2026-08-01T10:00:00Z" })))
      .toMatch(/closedAt must be after openedAt/);
  });

  it("accepts a well-ordered quick log", () => {
    const d = ok(openDowntimeSchema.safeParse({
      equipmentId: "e1", openedAt: "2026-08-01T09:00:00Z", closedAt: "2026-08-01T10:00:00Z", repairCost: "12.50",
    }));
    expect(d.closedAt!.getTime() - d.openedAt!.getTime()).toBe(3_600_000);
    expect(d.repairCost).toBe(12.5);
  });
});

describe("downtime update (PATCH)", () => {
  // Without .partial() an omitted `notes` still transformed to null, and the
  // route reads a present-but-null notes as "clear it" — so closing an event
  // would have wiped its notes.
  it("omits notes the caller did not send", () => {
    const d = ok(updateDowntimeSchema.safeParse({ close: true }));
    expect("notes" in d).toBe(false);
  });

  it("still clears notes when explicitly emptied", () => {
    expect(ok(updateDowntimeSchema.safeParse({ close: true, notes: "" })).notes).toBeNull();
  });

  it("rejects a non-boolean close flag", () => {
    expect(updateDowntimeSchema.safeParse({ close: "yes" }).success).toBe(false);
  });
});

describe("maintenance, users and login", () => {
  it("requires equipmentId and notes for maintenance", () => {
    const m = messages(createMaintenanceSchema.safeParse({}));
    expect(m).toMatch(/equipmentId is required/);
    expect(m).toMatch(/Notes is required/);
  });

  it("rejects a malformed email and lowercases a good one", () => {
    expect(messages(createUserSchema.safeParse({ email: "not-an-email", name: "A" }))).toMatch(/valid email/);
    expect(ok(createUserSchema.safeParse({ email: "  Staff@BGSU.edu ", name: "A" })).email).toBe("staff@bgsu.edu");
  });

  it("requires both login fields", () => {
    expect(messages(loginSchema.safeParse({ email: "a@b.c" }))).toMatch(/Password is required/);
    expect(messages(loginSchema.safeParse({ email: "", password: "x" }))).toMatch(/Email is required/);
  });
});
