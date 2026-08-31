import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BuildingLevel,
  CauseCategory,
  EquipmentStatus,
  IconCategory,
  ManualMatch,
} from "@/generated/prisma/enums";

// Routes used to read `await req.json()` straight into a hand-written type and
// hand the values to Prisma. Nothing checked them, so a wrong type reached the
// database driver and surfaced as an unhandled throw — a 500 where the caller
// deserved a 400 saying which field was wrong. These schemas put that boundary
// back.

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");
}

/**
 * Validate a JSON request body. Returns either the parsed value or a ready 400
 * naming the offending fields, mirroring how guardMutation returns its error.
 */
export async function parseBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: formatIssues(parsed.error) }, { status: 400 }) };
  }
  return { data: parsed.data };
}

// ── Shared field types ──────────────────────────────────────────────

const enumOf = <T extends Record<string, string>>(e: T, label: string) =>
  z.enum(Object.values(e) as [string, ...string[]], {
    message: `must be one of: ${Object.values(e).join(", ")}`,
  }).transform((v) => v as T[keyof T]).describe(label);

/** Trimmed, non-empty string. */
const required = (label: string) =>
  z.string({ message: `${label} is required` }).trim().min(1, `${label} is required`);

/** Trimmed string that becomes null when blank — how these columns are stored. */
const optionalText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (typeof v === "string" ? v.trim() || null : (v ?? null)));

/**
 * Money and similar: accepts a number or a numeric string (forms submit
 * strings), rejects blank/NaN/negative, and normalises to number | null.
 */
const optionalNonNegativeNumber = (label: string) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
      message: `${label} must be a number of 0 or more`,
    });

/** ISO-ish date string that must actually parse. */
const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : new Date(v)))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), { message: "must be a valid date" });

/**
 * Normalised map coordinate. mapX/mapY are 0-1 fractions of the floorplan; a
 * value outside that range puts a pin off the map where nothing can reach it,
 * so the range is part of the type rather than a convention.
 */
const mapCoord = z.number().min(0).max(1);

const email = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "must be a valid email address");

// ── Equipment ───────────────────────────────────────────────────────

export const createEquipmentSchema = z.object({
  itemId: required("Item ID"),
  name: required("Name"),
  brand: required("Brand"),
  level: enumOf(BuildingLevel, "level"),
  zone: required("Zone"),
  model: optionalText,
  serial: optionalText,
  iconCategory: enumOf(IconCategory, "iconCategory").optional(),
  vendor: optionalText,
  purchaseDate: optionalDate,
  cost: optionalNonNegativeNumber("Cost"),
  warrantyMonths: optionalNonNegativeNumber("Warranty months"),
  warrantyExpiresAt: optionalDate,
  manualUrl: optionalText,
  notes: optionalText,
});

// Every field optional — this is a PATCH — but each one that IS present is
// checked. `.strict()` is deliberately not used: the previous handler ignored
// unknown keys, and rejecting them now would break callers that send extras.
export const updateEquipmentSchema = z
  .object({
    name: required("Name"),
    brand: required("Brand"),
    model: optionalText,
    modelNote: optionalText,
    serial: optionalText,
    vendor: optionalText,
    notes: optionalText,
    manualUrl: optionalText,
    manualPdfUrl: optionalText,
    manualMatch: enumOf(ManualMatch, "manualMatch"),
    manualComment: optionalText,
    purchaseDate: optionalDate,
    cost: optionalNonNegativeNumber("Cost"),
    warrantyMonths: optionalNonNegativeNumber("Warranty months"),
    warrantyExpiresAt: optionalDate,
    mapX: mapCoord,
    mapY: mapCoord,
    iconCategory: enumOf(IconCategory, "iconCategory"),
    level: enumOf(BuildingLevel, "level"),
    zone: required("Zone"),
  })
  .partial();

// ── Downtime ────────────────────────────────────────────────────────

export const openDowntimeSchema = z
  .object({
    equipmentId: required("equipmentId"),
    status: enumOf(EquipmentStatus, "status").optional(),
    cause: enumOf(CauseCategory, "cause").optional(),
    notes: optionalText,
    openedAt: optionalDate,
    closedAt: optionalDate,
    repairCost: optionalNonNegativeNumber("Repair cost"),
  })
  .refine((b) => !(b.closedAt && b.openedAt && b.closedAt <= b.openedAt), {
    message: "closedAt must be after openedAt",
    path: ["closedAt"],
  });

// `.partial()` matters here, and not only for tidiness. Without it an absent
// optional field still runs its transform and lands in the output as null,
// which this route reads as "the caller asked to clear this". The close branch
// distinguishes an omitted `notes` from an explicitly emptied one, so a plain
// "close this event" would have wiped the notes off every event it closed.
// With `.partial()`, keys the caller did not send stay absent.
export const updateDowntimeSchema = z
  .object({
    status: enumOf(EquipmentStatus, "status"),
    cause: enumOf(CauseCategory, "cause"),
    notes: optionalText,
    close: z.boolean(),
    closedAt: optionalDate,
    repairCost: optionalNonNegativeNumber("Repair cost"),
    retire: z.boolean(),
  })
  .partial();

// ── Maintenance ─────────────────────────────────────────────────────

export const createMaintenanceSchema = z.object({
  equipmentId: required("equipmentId"),
  notes: required("Notes"),
  date: optionalDate,
  cost: optionalNonNegativeNumber("Cost"),
});

// ── Users ───────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email,
  name: required("Name"),
  password: optionalText,
});

export const updateUserSchema = z.object({
  email: email.optional(),
  name: z.string().trim().min(1, "Name is required").optional(),
  password: optionalText,
  resetPassword: z.boolean().optional(),
});

export const loginSchema = z.object({
  // The message is set on the type as well as the length, so an absent key
  // reads "Password is required" rather than "expected string, received
  // undefined" — the sign-in form shows this text directly.
  email: z.string({ message: "Email is required" }).trim().toLowerCase().min(1, "Email is required"),
  password: z.string({ message: "Password is required" }).min(1, "Password is required"),
});
