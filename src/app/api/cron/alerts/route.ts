import { NextRequest, NextResponse } from "next/server";
import { runAlerts } from "@/lib/alerts";

// Daily alert sweep, triggered by Vercel Cron (vercel.json). Vercel sends
// Authorization: Bearer <CRON_SECRET> when the env var is set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAlerts();
  return NextResponse.json({ ok: true, ...result });
}
