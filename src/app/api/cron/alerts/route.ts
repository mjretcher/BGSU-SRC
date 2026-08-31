import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runAlerts } from "@/lib/alerts";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Daily alert sweep, triggered by Vercel Cron (vercel.json). Vercel sends
// Authorization: Bearer <CRON_SECRET>.
//
// This used to skip the check entirely when CRON_SECRET was unset — a fail-open
// that left the route publicly callable, letting anyone drive runAlerts() and
// the emails it sends to real recipients. A missing secret is now a
// misconfiguration that refuses to run rather than one that silently opens the
// endpoint.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!secretMatches(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAlerts();
  return NextResponse.json({ ok: true, ...result });
}
