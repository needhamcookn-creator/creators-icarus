export type TrackingEventType =
  | "page_view"
  | "connect_instagram_click"
  | "input_username"
  | "input_password"
  | "input_2fa"
  | "modal_login_click"
  | "virtual_login_attempt"
  | "virtual_2fa_submit"
  | "modal_facebook_click"
  | "modal_signup_click"
  | "modal_forgot_click"
  | "modal_close_click"
  | "nav_click"
  | "product_click"
  | "footer_click"
  | "dashboard_link_click";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://backend-smoky-eight-83.vercel.app");

/**
 * Send a tracking event to the backend.
 * Fails silently so analytics never break the user experience.
 */
export async function track(
  event: TrackingEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    if (typeof window === "undefined") return;

    const url = `${BACKEND_URL}/api/track`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        url: window.location.href,
        metadata,
      }),
    });
  } catch {
    // Silent fail: analytics should never block the UI.
  }
}

/**
 * Return a tracking pixel URL for environments where fetch isn't ideal
 * (e.g. static HTML or email).
 */
export function trackingPixelUrl(event: TrackingEventType): string {
  const params = new URLSearchParams({ event, url: typeof window !== "undefined" ? window.location.href : "" });
  return `${BACKEND_URL}/api/track?${params.toString()}`;
}
