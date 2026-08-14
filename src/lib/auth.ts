import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac, type ScryptOptions } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export const SESSION_COOKIE = "bgsu_src_session";

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

// ── Password hashing ────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, salt, expected.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ── HMAC-signed session cookie (no session table) ───────────────────
// Payload: userId.email.expiresAtEpoch, signed with SESSION_SECRET.
// Fixed expiry at the next local midnight — not a rolling idle timer.

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, email: string): { token: string; expires: Date } {
  const expires = new Date();
  expires.setHours(23, 59, 59, 999); // fixed daily expiration
  const payload = `${Buffer.from(userId).toString("base64url")}.${Buffer.from(email).toString("base64url")}.${expires.getTime()}`;
  return { token: `${payload}.${sign(payload)}`, expires };
}

export type SessionUser = { userId: string; email: string };

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expectedSig = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userB64, emailB64, expStr] = payload.split(".");
  if (!userB64 || !emailB64 || !expStr) return null;
  if (Date.now() > Number(expStr)) return null;
  return {
    userId: Buffer.from(userB64, "base64url").toString(),
    email: Buffer.from(emailB64, "base64url").toString(),
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

// ── Login rate limiting (per-account and per-IP, in-memory) ─────────
// Serverless instances each keep their own window; acceptable at 2-3 users.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function rateLimitCheck(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  b.count++;
  return b.count <= MAX_ATTEMPTS;
}

// ── Audit ───────────────────────────────────────────────────────────

export async function auditAuth(actorEmail: string, action: string, detail?: object) {
  await db.auditLog.create({
    data: { actorEmail, action, targetType: "User", after: detail ? JSON.parse(JSON.stringify(detail)) : undefined },
  });
}
