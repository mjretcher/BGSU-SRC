import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE, type SessionUser } from "./auth";
import { checkOrigin } from "./csrf";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export function sessionFrom(req: NextRequest): SessionUser | null {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

// Guard for mutating routes: valid session + same-origin.
export function guardMutation(req: NextRequest): { user: SessionUser } | { error: NextResponse } {
  const user = sessionFrom(req);
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
