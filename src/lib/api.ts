import { NextRequest, NextResponse } from "next/server";
import { resolveSession, SESSION_COOKIE, type SessionUser } from "./auth";
import { checkOrigin } from "./csrf";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

// Async because resolving a session now checks the account still exists and the
// session has not been revoked, which needs a database read. A purely
// signature-based check cannot see a deleted user or a password reset.
export async function sessionFrom(req: NextRequest): Promise<SessionUser | null> {
  return resolveSession(req.cookies.get(SESSION_COOKIE)?.value);
}

// Guard for mutating routes: live session + same-origin.
export async function guardMutation(req: NextRequest): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await sessionFrom(req);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!checkOrigin(req)) return { error: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  return { user };
}

export async function audit(
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  before?: unknown,
  after?: unknown,
) {
  await db.auditLog.create({
    data: {
      actorEmail,
      action,
      targetType,
      targetId,
      before: before === undefined ? undefined : (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue),
      after: after === undefined ? undefined : (JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue),
    },
  });
}
