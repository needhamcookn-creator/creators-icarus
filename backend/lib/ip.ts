import { type NextRequest } from "next/server";

/**
 * Extract the client's public IP from request headers.
 * Vercel forwards the original client IP in x-forwarded-for.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; the first is the client.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback if no proxy headers are present.
  return "unknown";
}
