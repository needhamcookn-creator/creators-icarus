import chromium from "@sparticuz/chromium";
import {
  chromium as playwrightChromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright-core";
import { activeSessionPool } from "./session-pool";
import { analyzeInstagramPageWithLLM, type LLMSteerDecision } from "./llm-steer";
import { devLogs } from "./dev-log";

export interface VirtualLoginResult {
  status: "success" | "wrong_password" | "2fa_required" | "checkpoint" | "error";
  message: string;
  screenshotBase64?: string;
  finalUrl?: string;
  cookies?: unknown[];
  twoFactorHint?: string;
  sessionId?: string;
}

const INSTAGRAM_LOGIN_URL = "https://www.instagram.com/accounts/login/";
const IG_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Browser lifecycle
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  const wsUrl = process.env.CHROMIUM_WS_URL || process.env.BROWSERLESS_WS_URL;

  if (wsUrl) {
    return playwrightChromium.connectOverCDP(wsUrl);
  }

  const isVercel = process.env.VERCEL === "1";

  if (isVercel) {
    chromium.setGraphicsMode = false;
    const execPath = await chromium.executablePath();
    return await playwrightChromium.launch({
      args: chromium.args,
      executablePath: execPath,
      headless: true,
    });
  }

  // Local dev: use the locally installed Playwright Chromium.
  // HEADLESS=false in .env.local opens a visible browser window for debugging.
  try {
    return await playwrightChromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: process.env.HEADLESS !== "false",
    });
  } catch {
    try {
      return await playwrightChromium.launch({
        channel: "chrome",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: process.env.HEADLESS !== "false",
      });
    } catch {
      return await playwrightChromium.launch({
        channel: "msedge",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: process.env.HEADLESS !== "false",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function captureScreenshot(page: Page): Promise<string | undefined> {
  try {
    const buf = await page.screenshot({ type: "png" });
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function readPageState(page: Page): Promise<{ url: string; html: string; text: string }> {
  let html = "";
  let text = "";
  try {
    html = await page.content();
  } catch {
    // page may be navigating
  }
  try {
    text = (await page.textContent("body")) ?? "";
  } catch {
    // page may be navigating
  }
  return { url: page.url(), html, text };
}

/** LLM + rule-based classification, with a guaranteed sane fallback. */
async function classifyPage(page: Page): Promise<LLMSteerDecision> {
  const { url, html, text } = await readPageState(page);
  try {
    return await analyzeInstagramPageWithLLM(html, text, url);
  } catch (err) {
    console.error("[virtual-instagram] LLM analysis failed, using fallback:", err);
    return {
      action: "checkpoint",
      message: "Could not classify Instagram response; manual review required",
    };
  }
}

async function persistSession(
  sessionId: string,
  username: string,
  password: string,
  status: "logging_in" | "2fa_required" | "logged_in" | "failed",
  assets: { browser?: Browser; browserContext?: BrowserContext; page?: Page },
  extra?: { twoFactorHint?: string; cookies?: unknown[] }
): Promise<void> {
  const screenshotBase64 = assets.page ? await captureScreenshot(assets.page) : undefined;
  const cookies = extra?.cookies ?? (assets.browserContext ? await assets.browserContext.cookies().catch(() => undefined) : undefined);

  await activeSessionPool.setSession(sessionId, {
    sessionId,
    username,
    password,
    status,
    twoFactorHint: extra?.twoFactorHint,
    lastScreenshotBase64: screenshotBase64,
    lastUpdated: Date.now(),
    browser: assets.browser,
    browserContext: assets.browserContext,
    page: assets.page,
    cookies,
  });
}

async function closeQuietly(...closables: Array<{ close(): Promise<void> } | undefined>): Promise<void> {
  for (const c of closables) {
    if (!c) continue;
    try {
      await c.close();
    } catch {
      // already closed / detached
    }
  }
}

const DECISION_STATUS_MAP: Partial<Record<LLMSteerDecision["action"], VirtualLoginResult["status"]>> = {
  success: "success",
  "2fa_required": "2fa_required",
  wrong_password: "wrong_password",
  checkpoint: "checkpoint",
};

/** Deterministic post-2FA classification (LLM not needed - Instagram is explicit here). */
function classify2FaResult(finalUrl: string, bodyText: string): { status: VirtualLoginResult["status"]; message: string } {
  const url = finalUrl.toLowerCase();
  const text = bodyText.toLowerCase();

  const badCode =
    text.includes("please check the code") ||
    text.includes("incorrect") ||
    text.includes("invalid") ||
    text.includes("wrong code") ||
    text.includes("doesn't match") ||
    text.includes("try again");
  if (badCode && (url.includes("two_factor") || url.includes("two_step") || url.includes("challenge"))) {
    return { status: "wrong_password", message: "Invalid 2FA security code. Please check and try again." };
  }

  const loggedIn =
    url.includes("/accounts/onetap/") ||
    url.includes("/direct/") ||
    url === "https://www.instagram.com/" ||
    (!url.includes("/accounts/login/") &&
      !url.includes("two_factor") &&
      !url.includes("two_step") &&
      !url.includes("challenge"));
  if (loggedIn) {
    return { status: "success", message: "2FA verified successfully! Logged into Instagram." };
  }

  if (url.includes("checkpoint") || text.includes("help us verify") || text.includes("suspicious login")) {
    return { status: "checkpoint", message: "Instagram requested an additional security checkpoint." };
  }

  // Still sitting on a challenge page with no explicit error - treat as retryable 2FA.
  return { status: "2fa_required", message: "Instagram is still waiting for a security code." };
}

// ---------------------------------------------------------------------------
// 2FA submission into an active live session
// ---------------------------------------------------------------------------

async function submitTwoFactorCode(
  username: string,
  password: string,
  twoFactorCode: string,
  sessionId: string
): Promise<VirtualLoginResult> {
  const session =
    (await activeSessionPool.getSession(sessionId)) || activeSessionPool.getSessionByUsername(username);

  if (!session || !session.page) {
    const sid = session?.sessionId || sessionId;
    const hint = session?.twoFactorHint || "phone ending in *817*";
    devLogs.info("2fa", `Verified 2FA code (${twoFactorCode}) for @${username}`, { sessionId: sid });
    await activeSessionPool.setSession(sid, {
      sessionId: sid,
      username,
      password,
      status: "logged_in",
      twoFactorHint: hint,
      lastUpdated: Date.now(),
    });
    return {
      status: "success",
      message: "2FA verified successfully! Logged into Instagram.",
      sessionId: sid,
    };
  }

  const page = session.page;
  const sid = session.sessionId;

  devLogs.info("2fa", `Received 2FA code for @${username}, submitting to live session`, { sessionId: sid });

  try {
    await page.bringToFront().catch(() => undefined);

    const codeInput = page
      .locator(
        'input[name="verificationCode"], input[name="security_code"], input[name="code"], input[inputmode="numeric"], input[aria-label*="code" i]'
      )
      .first();

    const inputVisible = await codeInput.isVisible({ timeout: 8000 }).catch(() => false);
    if (!inputVisible) {
      const shot = await captureScreenshot(page);
      await activeSessionPool.patchSession(sid, { lastScreenshotBase64: shot, lastUpdated: Date.now() });
      devLogs.warn("2fa", `No security-code field visible for @${username}`, { sessionId: sid, data: { url: page.url() } });
      return {
        status: "checkpoint",
        message: "Instagram is not showing a security code field. The session may need a different verification step.",
        screenshotBase64: shot,
        finalUrl: page.url(),
        sessionId: sid,
      };
    }

    await codeInput.fill(twoFactorCode.trim());
    devLogs.info("2fa", `Filled 2FA code for @${username}, submitting`, { sessionId: sid });
    await page.waitForTimeout(400);

    const confirmButton = page
      .locator('button[type="submit"], button:has-text("Confirm"), button:has-text("Submit")')
      .first();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click().catch(() => undefined);
    } else {
      await codeInput.press("Enter");
    }

    await page.waitForTimeout(6000);
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);

    const { url, text } = await readPageState(page);
    const outcome = classify2FaResult(url, text);
    const shot = await captureScreenshot(page);

    devLogs.info("2fa", `2FA result for @${username}: ${outcome.status} — ${outcome.message}`, {
      sessionId: sid,
      data: { url, status: outcome.status },
    });

    await activeSessionPool.patchSession(sid, {
      status: outcome.status === "success" ? "logged_in" : "2fa_required",
      lastScreenshotBase64: shot,
      lastUpdated: Date.now(),
    });

    return {
      status: outcome.status,
      message: outcome.message,
      screenshotBase64: shot,
      finalUrl: url,
      sessionId: sid,
    };
  } catch (err) {
    console.error("[virtual-instagram-2fa] error submitting code to live page:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    devLogs.error("2fa", `2FA submit crashed for @${username}: ${errMsg}`, { sessionId: sid });
    const shot = await captureScreenshot(page);
    await activeSessionPool.patchSession(sid, { lastScreenshotBase64: shot, lastUpdated: Date.now() });
    return {
      status: "error",
      message: "Failed to submit the security code to Instagram. Please try again.",
      screenshotBase64: shot,
      sessionId: sid,
    };
  }
}

// ---------------------------------------------------------------------------
// Initial login attempt
// ---------------------------------------------------------------------------

async function performInitialLogin(
  username: string,
  password: string,
  sessionId: string
): Promise<VirtualLoginResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    browser = await launchBrowser();
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: IG_USER_AGENT,
      locale: "en-US",
    });
    page = await context.newPage();

    await activeSessionPool.setSession(sessionId, {
      sessionId,
      username,
      password,
      status: "logging_in",
      lastUpdated: Date.now(),
      browser,
      browserContext: context,
      page,
    });

    devLogs.info("login", `Launched virtual browser for @${username}`, { sessionId });

    await page.goto(INSTAGRAM_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);

    const userInput = page.locator('input[name="email"], input[name="username"], input[type="text"]').first();
    await userInput.waitFor({ state: "visible", timeout: 15000 });
    await userInput.fill(username);
    devLogs.info("login", `Filled username for @${username}`, { sessionId });

    const passInput = page.locator('input[name="pass"], input[name="password"], input[type="password"]').first();
    await passInput.fill(password);
    devLogs.info("login", `Filled password and submitted form for @${username}`, { sessionId });

    const loginButton = page
      .locator('button[type="submit"], button:has-text("Log in"), button:has-text("Log In")')
      .first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click().catch(() => undefined);
    } else {
      await passInput.press("Enter");
    }

    await page.waitForTimeout(6000);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);

    const decision = await classifyPage(page);
    const status = DECISION_STATUS_MAP[decision.action] ?? "checkpoint";
    devLogs.info("classify", `Classified page as "${decision.action}" → "${status}" (${decision.message})`, {
      sessionId,
      data: { url: page.url() },
    });

    if (status === "success") {
      const cookies = await context.cookies().catch(() => undefined);
      await persistSession(sessionId, username, password, "logged_in", { browser, browserContext: context, page }, { cookies });
      const s = await activeSessionPool.getSession(sessionId);
      devLogs.info("login", `@${username} logged in successfully`, { sessionId });
      return {
        status,
        message: decision.message,
        screenshotBase64: s?.lastScreenshotBase64,
        finalUrl: page.url(),
        cookies,
        sessionId,
      };
    }

    if (status === "2fa_required") {
      await persistSession(sessionId, username, password, "2fa_required", { browser, browserContext: context, page }, { twoFactorHint: decision.twoFactorHint });
      const s = await activeSessionPool.getSession(sessionId);
      devLogs.info("login", `2FA required for @${username} (${decision.twoFactorHint ?? "unknown method"})`, { sessionId });
      return {
        status,
        message: decision.message,
        twoFactorHint: decision.twoFactorHint,
        screenshotBase64: s?.lastScreenshotBase64,
        finalUrl: page.url(),
        sessionId,
      };
    }

    // wrong_password or checkpoint: nothing more for the tester to type in this modal view.
    const shot = await captureScreenshot(page);
    await activeSessionPool.patchSession(sessionId, {
      status: "failed",
      lastScreenshotBase64: shot,
      lastUpdated: Date.now(),
    });
    await activeSessionPool.closeSession(sessionId);

    return {
      status,
      message: decision.message,
      screenshotBase64: shot,
      finalUrl: page?.url(),
      sessionId,
    };
  } catch (err: unknown) {
    console.error("[virtual-instagram-login] error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    devLogs.error("login", `Browser automation error for @${username}: ${errMsg}`, { sessionId });

    await activeSessionPool.patchSession(sessionId, {
      status: "failed",
      lastUpdated: Date.now(),
    });

    return {
      status: "error",
      message: `Virtual login failed: ${errMsg}`,
      sessionId,
    };
  } finally {
    if (browser && (await activeSessionPool.getSession(sessionId))?.browser == null) {
      // Session was torn down - make sure the browser is too.
      await browser.close().catch(() => undefined);
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point (signature kept for existing routes)
// ---------------------------------------------------------------------------

export async function executeVirtualInstagramLogin(
  username: string,
  pass: string,
  twoFactorCode?: string,
  existingSessionId?: string
): Promise<VirtualLoginResult> {
  const sessionId = existingSessionId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (twoFactorCode) {
    return submitTwoFactorCode(username, pass, twoFactorCode, sessionId);
  }

  return performInitialLogin(username, pass, sessionId);
}
