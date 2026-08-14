import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { guardMutation, sessionFrom, audit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!sessionFrom(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const guard = guardMutation(req);
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => null)) as { email?: string; name?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim();
  if (!email || !name) return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });

  const password = body?.password?.trim() || randomBytes(9).toString("base64url");
  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });
  await audit(guard.user.email, "user.created", "User", user.id, undefined, { email, name });
  // The generated password is returned exactly once and never stored in plain form.
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
    generatedPassword: body?.password?.trim() ? undefined : password,
  });
}
