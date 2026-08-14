import { NextRequest, NextResponse } from "next/server";
import { getSession, auditAuth, SESSION_COOKIE } from "@/lib/auth";
import { checkOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const session = await getSession();
  if (session) await auditAuth(session.email, "auth.logout");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
