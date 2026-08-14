import { NextRequest } from "next/server";

// CSRF protection for mutating API routes: the Origin (or Referer) header
// must match the request host. Browsers always send Origin on cross-site
// POSTs, so a mismatch or absence from a browser form post is rejected.
export function checkOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return originHost === host;
  } catch {
    return false;
  }
}
