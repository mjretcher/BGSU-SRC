import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { guardMutation, sessionFrom, audit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { parseBody, createUserSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  if (!(await sessionFrom(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const parsed = await parseBody(req, createUserSchema);
  if ("error" in parsed) return parsed.error;
  const { email, name } = parsed.data;
  const suppliedPassword = parsed.data.password;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });

  const password = suppliedPassword || randomBytes(9).toString("base64url");
  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });
  await audit(guard.user.email, "user.created", "User", user.id, undefined, { email, name });
  // The generated password is returned exactly once and never stored in plain form.
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
    generatedPassword: suppliedPassword ? undefined : password,
  });
}
