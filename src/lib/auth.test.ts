import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

// auth.ts reads SESSION_SECRET at call time and pulls in db.ts, which reads
// DATABASE_URL when it constructs the client. Both are set before the import so
// the module loads; no query is ever issued by these tests.
const SECRET = "test-secret-not-a-real-one";
process.env.SESSION_SECRET = SECRET;
process.env.DATABASE_URL ??= "postgresql://user:pass@127.0.0.1:5432/unused";

let createSessionToken: typeof import("./auth").createSessionToken;
let verifySessionToken: typeof import("./auth").verifySessionToken;
let isSessionLive: typeof import("./auth").isSessionLive;

beforeAll(async () => {
  ({ createSessionToken, verifySessionToken, isSessionLive } = await import("./auth"));
});

const sign = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("base64url");
const b64 = (s: string) => Buffer.from(s).toString("base64url");

describe("session tokens", () => {
  it("round-trips the signed-in user", () => {
    const { token } = createSessionToken("user-1", "staff@bgsu.edu");
    const v = verifySessionToken(token);
    expect(v?.userId).toBe("user-1");
    expect(v?.email).toBe("staff@bgsu.edu");
  });

  it("stamps the issue time the revocation check depends on", () => {
    const before = Date.now();
    const { token } = createSessionToken("user-1", "staff@bgsu.edu");
    const v = verifySessionToken(token);
    expect(v?.issuedAt).toBeGreaterThanOrEqual(before);
    expect(v?.issuedAt).toBeLessThanOrEqual(Date.now());
  });

  it("rejects a tampered payload", () => {
    const { token } = createSessionToken("user-1", "staff@bgsu.edu");
    const [, ...rest] = token.split(".");
    expect(verifySessionToken([b64("someone-else"), ...rest].join("."))).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const { token } = createSessionToken("user-1", "staff@bgsu.edu");
    const parts = token.split(".");
    parts[parts.length - 1] = sign("a different payload entirely");
    expect(verifySessionToken(parts.join("."))).toBeNull();
  });

  it("rejects an expired token", () => {
    // Signed with the real secret, so only the expiry can be what rejects it.
    const payload = [b64("user-1"), b64("staff@bgsu.edu"), Date.now() - 1000, Date.now() - 5000].join(".");
    expect(verifySessionToken(`${payload}.${sign(payload)}`)).toBeNull();
  });

  it("rejects a correctly-signed token in the pre-revocation format", () => {
    // The downgrade attempt that matters: a legacy 3-field payload carries no
    // issued-at, so honouring it would mean honouring a session that can never
    // be revoked. Signed with the real secret so the signature is genuinely
    // valid and the format is the only thing rejecting it.
    const expires = new Date();
    expires.setHours(23, 59, 59, 999);
    const legacy = [b64("user-1"), b64("staff@bgsu.edu"), expires.getTime()].join(".");
    expect(verifySessionToken(`${legacy}.${sign(legacy)}`)).toBeNull();
  });

  it("rejects a token with a non-numeric issue time", () => {
    const expires = Date.now() + 60_000;
    const payload = [b64("user-1"), b64("staff@bgsu.edu"), expires, "not-a-number"].join(".");
    expect(verifySessionToken(`${payload}.${sign(payload)}`)).toBeNull();
  });

  it("rejects missing and malformed tokens", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("nodotshere")).toBeNull();
    expect(verifySessionToken("a.b.c.d.e")).toBeNull();
  });
});

// The decision resolveSession makes once it has the user row. Kept free of I/O
// so the revocation rules are pinned down without a database.
describe("session revocation", () => {
  const at = (ms: number) => ({ sessionsValidFrom: new Date(ms) });

  it("ends the session of a deleted account", () => {
    expect(isSessionLive(Date.now(), null)).toBe(false);
  });

  it("keeps a session issued after the cutoff", () => {
    expect(isSessionLive(10_000, at(5_000))).toBe(true);
  });

  it("ends a session issued before the cutoff", () => {
    expect(isSessionLive(5_000, at(10_000))).toBe(false);
  });

  it("keeps a session issued at exactly the cutoff", () => {
    // The sign-in that immediately follows a reset stamps the same instant at
    // worst; it must survive or a reset would lock the user out of their new
    // password.
    expect(isSessionLive(10_000, at(10_000))).toBe(true);
  });

  it("ends a session issued a single millisecond before the cutoff", () => {
    // Rounding this comparison to whole seconds left sessions issued earlier in
    // the same second alive through a password reset that meant to end them.
    expect(isSessionLive(10_600, at(10_601))).toBe(false);
    expect(isSessionLive(10_200, at(10_600))).toBe(false);
  });

  it("treats an untouched account as never revoked", () => {
    // sessionsValidFrom defaults to row creation, so every later token is live.
    const created = Date.parse("2026-01-01T00:00:00Z");
    expect(isSessionLive(created + 1, at(created))).toBe(true);
  });
});
