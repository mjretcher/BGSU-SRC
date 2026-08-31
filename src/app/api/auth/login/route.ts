import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  rateLimitCheck,
  auditAuth,
  SESSION_COOKIE,
} from "@/lib/auth";
import { checkOrigin } from "@/lib/csrf";
import { parseBody, loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const parsed = await parseBody(req, loginSchema);
  if ("error" in parsed) return parsed.error;
  const { email, password } = parsed.data;

  if (!rateLimitCheck(`ip:${ip}`) || !rateLimitCheck(`acct:${email}`)) {
    await auditAuth(email, "auth.login_rate_limited", { ip });
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    await auditAuth(email, "auth.login_failed", { ip });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { token, expires } = createSessionToken(user.id, user.email);
  await auditAuth(user.email, "auth.login_success", { ip });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
