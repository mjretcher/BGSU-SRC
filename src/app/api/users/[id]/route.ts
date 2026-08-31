import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { guardMutation, audit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    resetPassword?: boolean;
    password?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { name?: string; email?: string; passwordHash?: string; sessionsValidFrom?: Date } = {};
  const changes: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};

  if (body.name?.trim() && body.name.trim() !== user.name) {
    before.name = user.name;
    data.name = changes.name = body.name.trim();
  }
  if (body.email?.trim()) {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (email !== user.email) {
      const clash = await db.user.findUnique({ where: { email } });
      if (clash) return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
      before.email = user.email;
      data.email = changes.email = email;
    }
  }

  let generatedPassword: string | undefined;
  if (body.resetPassword || body.password) {
    const password = body.password?.trim() || randomBytes(9).toString("base64url");
    if (!body.password) generatedPassword = password;
    data.passwordHash = await hashPassword(password);
    // End every session issued under the old password. Without this the reset
    // changes only what a future sign-in needs, and whoever was already signed
    // in stays signed in — which is precisely the case a reset is used for.
    data.sessionsValidFrom = new Date();
    changes.passwordReset = true;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  await db.user.update({ where: { id }, data });
  await audit(guard.user.email, changes.passwordReset ? "user.password_reset" : "user.updated", "User", id, before, changes);
  return NextResponse.json({ ok: true, generatedPassword });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await guardMutation(req);
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.id === guard.user.userId) {
    return NextResponse.json({ error: "You can't delete the account you're signed in with" }, { status: 400 });
  }
  const count = await db.user.count();
  if (count <= 1) return NextResponse.json({ error: "Can't delete the last user" }, { status: 400 });

  await db.user.delete({ where: { id } });
  await audit(guard.user.email, "user.deleted", "User", id, { email: user.email, name: user.name }, undefined);
  return NextResponse.json({ ok: true });
}
