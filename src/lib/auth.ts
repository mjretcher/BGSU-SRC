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
  const issuedAt = Date.now();
  const payload = [
    Buffer.from(userId).toString("base64url"),
    Buffer.from(email).toString("base64url"),
    expires.getTime(),
    issuedAt,
  ].join(".");
  return { token: `${payload}.${sign(payload)}`, expires };
}

export type SessionUser = { userId: string; email: string };
type VerifiedToken = SessionUser & { issuedAt: number };

// Signature + expiry only. This says the cookie is authentic and unexpired; it
// does NOT say the account still exists or that the session has not been
// revoked since. Use resolveSession/getSession for that.
export function verifySessionToken(token: string | undefined): VerifiedToken | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expectedSig = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userB64, emailB64, expStr, issuedStr] = payload.split(".");
  // issuedStr is absent on pre-revocation tokens; those are refused so the
  // revocation check can never be skipped by presenting an older format.
  if (!userB64 || !emailB64 || !expStr || !issuedStr) return null;
  const issuedAt = Number(issuedStr);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() > Number(expStr)) return null;
  return {
    userId: Buffer.from(userB64, "base64url").toString(),
    email: Buffer.from(emailB64, "base64url").toString(),
    issuedAt,
  };
}

// The revocation decision on its own, with no I/O, so it can be tested
// directly. A token is live when the account still exists and the token was
// issued no earlier than the account's cutoff.
//
// Compared in whole milliseconds, which is exact on both sides: the token
// stamps Date.now(), and sessionsValidFrom is TIMESTAMP(3). Rounding to seconds
// here would leave a sub-second window in which a password reset failed to
// revoke a session issued moments before it.
export function isSessionLive(issuedAt: number, user: { sessionsValidFrom: Date } | null): boolean {
  if (!user) return false; // deleted account
  return issuedAt >= user.sessionsValidFrom.getTime();
}

// Full check: authentic, unexpired, the account still exists, and the session
// has not been revoked (by deletion, a password reset, or a manual sign-out-
// everywhere). One indexed primary-key lookup.
export async function resolveSession(token: string | undefined): Promise<SessionUser | null> {
  const verified = verifySessionToken(token);
  if (!verified) return null;
  const user = await db.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, email: true, sessionsValidFrom: true },
  });
  if (!user || !isSessionLive(verified.issuedAt, user)) return null;
  return { userId: user.id, email: user.email };
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return resolveSession(jar.get(SESSION_COOKIE)?.value);
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
