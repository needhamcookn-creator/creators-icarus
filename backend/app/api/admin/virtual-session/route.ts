import { type NextRequest } from "next/server";
import { activeSessionPool } from "@/lib/session-pool";
import { corsHeaders } from "@/lib/cors";

function checkAdminAuth(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;
  const provided =
    request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token") ?? "";
  return provided === adminToken;
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  }

  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId") ?? "";

  const session = await activeSessionPool.getSession(sessionId);

  // If no local page in lambda, attempt proxying to persistent runner microservice if configured
  const runnerUrl = process.env.RUNNER_API_URL;
  if ((!session || !session.page) && runnerUrl) {
    try {
      const adminToken = process.env.ADMIN_TOKEN || "";
      const res = await fetch(`${runnerUrl}/api/sessions?token=${encodeURIComponent(adminToken)}`, {
        headers: { "x-admin-token": adminToken },
      });
      const data = await res.json();
      return Response.json(data, { headers: corsHeaders(request) });
    } catch (err) {
      console.error("[virtual-session/GET] Proxy to runner failed:", err);
    }
  }

  if (!session || !session.page) {
    // Return summary of all active sessions in pool if no specific sessionId given
    const sessionsList = await activeSessionPool.getAllSessions();
    const all = sessionsList.map((s) => ({
      sessionId: s.sessionId,
      username: s.username,
      status: s.status,
      lastUpdated: s.lastUpdated,
      hasPage: Boolean(s.page),
      lastScreenshotBase64: s.lastScreenshotBase64,
    }));
    return Response.json({ activeSessions: all }, { headers: corsHeaders(request) });
  }

  try {
    const screenshotBuffer = await session.page.screenshot({ type: "png" });
    const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
    const url = session.page.url();

    return Response.json(
      {
        sessionId: session.sessionId,
        username: session.username,
        status: session.status,
        url,
        screenshotBase64,
      },
      { headers: corsHeaders(request) }
    );
  } catch (err) {
    console.error("[virtual-session/GET] error:", err);
    return Response.json({ error: "Failed to capture live screenshot" }, { status: 500, headers: corsHeaders(request) });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(request) });
  }

  try {
    const body = await request.json();
    const { sessionId, action, x, y, text, url, key } = body;

    const session = await activeSessionPool.getSession(sessionId);

    // If no local page in lambda, proxy command to persistent runner microservice if configured
    const runnerUrl = process.env.RUNNER_API_URL;
    if ((!session || !session.page) && runnerUrl) {
      const adminToken = process.env.ADMIN_TOKEN || "";
      const runnerRes = await fetch(`${runnerUrl}/api/session/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify(body),
      });
      const data = await runnerRes.json();
      return Response.json(data, { headers: corsHeaders(request) });
    }

    if (!session || !session.page) {
      return Response.json(
        { error: "Active virtual session not found or closed" },
        { status: 404, headers: corsHeaders(request) }
      );
    }

    const page = session.page;

    if (action === "click" && typeof x === "number" && typeof y === "number") {
      await page.mouse.click(x, y);
      await page.waitForTimeout(1000);
    } else if (action === "type" && typeof text === "string") {
      await page.keyboard.type(text, { delay: 50 });
      await page.waitForTimeout(500);
    } else if (action === "press" && typeof key === "string") {
      await page.keyboard.press(key);
      await page.waitForTimeout(500);
    } else if (action === "navigate" && typeof url === "string") {
      await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(1000);
    }

    const screenshotBuffer = await page.screenshot({ type: "png" });
    const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
    const currentUrl = page.url();

    return Response.json(
      {
        success: true,
        action,
        url: currentUrl,
        screenshotBase64,
      },
      { headers: corsHeaders(request) }
    );
  } catch (err: unknown) {
    console.error("[virtual-session/POST] error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to execute session command" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
