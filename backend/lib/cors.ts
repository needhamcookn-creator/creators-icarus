import { type NextRequest } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000"];

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  if (env) {
    return env
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

export function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();

  if (allowed.includes(origin)) return origin;
  if (allowed.includes("*")) return "*";

  // If no explicit match, return the first allowed origin so the request
  // can still work in trusted environments (e.g. same-origin, curl).
  return allowed[0] ?? "*";
}

export function corsHeaders(request: NextRequest): HeadersInit {
  return {
    "Access-Control-Allow-Origin": getCorsOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
    "Access-Control-Allow-Credentials": "true",
  };
}
