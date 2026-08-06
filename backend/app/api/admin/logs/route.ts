import { type NextRequest } from "next/server";
import { getLogs } from "@/lib/dev-log";
import { corsHeaders } from "@/lib/cors";

function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const provided =
    request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token") ?? "";
  return provided === adminToken;
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  }

  const limitParam = request.nextUrl.searchParams.get("limit") ?? "100";
  const limit = Math.max(1, Math.min(500, Number(limitParam) || 100));

  return Response.json(
    { logs: getLogs(limit) },
    { headers: corsHeaders(request) }
  );
}
