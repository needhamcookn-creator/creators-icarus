import express, { Request, Response } from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { Redis } from "@upstash/redis";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3002", 10);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "xrpxrpxrp";

let redis: Redis | null = null;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

interface RunnerSession {
  sessionId: string;
  username: string;
  password?: string;
  status: "logging_in" | "2fa_required" | "logged_in" | "failed";
  twoFactorHint?: string;
  lastScreenshotBase64?: string;
  lastUpdated: number;
  browserContext?: BrowserContext;
  page?: Page;
}

class SessionManager {
  private browser: Browser | null = null;
  private sessions = new Map<string, RunnerSession>();

  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("[runner/browser] Launching persistent Chromium instance...");
      try {
        this.browser = await chromium.launch({
          headless: process.env.HEADLESS !== "false",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
          ],
        });
      } catch (err) {
        console.error("[runner/browser] Launch error:", err);
        throw err;
      }
    }
    return this.browser;
  }

  async createOrGetSession(sessionId: string, username: string, password?: string): Promise<RunnerSession> {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      locale: "en-US",
    });

    const page = await context.newPage();
    const session: RunnerSession = {
      sessionId,
      username,
      password,
      status: "logging_in",
      lastUpdated: Date.now(),
      browserContext: context,
      page,
    };

    this.sessions.set(sessionId, session);
    await this.syncRedis(session);
    return session;
  }

  getSession(sessionId: string): RunnerSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): RunnerSession[] {
    return Array.from(this.sessions.values());
  }

  async captureScreenshot(sessionId: string): Promise<string | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page || session.page.isClosed()) return undefined;

    try {
      const buf = await session.page.screenshot({ type: "png" });
      const base64 = `data:image/png;base64,${buf.toString("base64")}`;
      session.lastScreenshotBase64 = base64;
      session.lastUpdated = Date.now();
      await this.syncRedis(session);
      return base64;
    } catch (err) {
      console.error(`[runner/screenshot] Error for session ${sessionId}:`, err);
      return undefined;
    }
  }

  async patchSession(sessionId: string, patch: Partial<RunnerSession>) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, patch, { lastUpdated: Date.now() });
    await this.syncRedis(session);
  }

  async closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        if (session.page && !session.page.isClosed()) await session.page.close();
        if (session.browserContext) await session.browserContext.close();
      } catch (err) {
        console.error(`[runner/close] Error closing session ${sessionId}:`, err);
      }
      this.sessions.delete(sessionId);
    }
  }

  private async syncRedis(session: RunnerSession) {
    if (!redis) return;
    try {
      const payload = {
        sessionId: session.sessionId,
        username: session.username,
        password: session.password,
        status: session.status,
        twoFactorHint: session.twoFactorHint,
        lastScreenshotBase64: session.lastScreenshotBase64,
        lastUpdated: session.lastUpdated,
      };
      await redis.set(`session:${session.sessionId}`, JSON.stringify(payload), { ex: 86400 });
      await redis.sadd("sessions:all", session.sessionId);
    } catch (err) {
      console.error("[runner/redis] Sync error:", err);
    }
  }
}

const sessionManager = new SessionManager();

// Setup Express App
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// HTTP Route Authentication Middleware
function authCheck(req: Request, res: Response, next: () => void) {
  const token = req.headers["x-admin-token"] || req.query.token;
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    activeSessionsCount: sessionManager.getAllSessions().length,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/sessions", authCheck, async (_req, res) => {
  const sessions = sessionManager.getAllSessions().map((s) => ({
    sessionId: s.sessionId,
    username: s.username,
    status: s.status,
    lastUpdated: s.lastUpdated,
    hasPage: Boolean(s.page && !s.page.isClosed()),
    url: s.page && !s.page.isClosed() ? s.page.url() : undefined,
  }));
  res.json({ activeSessions: sessions });
});

app.post("/api/session/launch", authCheck, async (req, res) => {
  const { sessionId, username, password } = req.body;
  if (!sessionId || !username) {
    res.status(400).json({ error: "sessionId and username required" });
    return;
  }

  try {
    const session = await sessionManager.createOrGetSession(sessionId, username, password);
    res.json({
      success: true,
      sessionId: session.sessionId,
      status: session.status,
    });
  } catch (err: any) {
    console.error("[runner/launch] error:", err);
    res.status(500).json({ error: err.message || "Failed to launch session" });
  }
});

app.post("/api/session/action", authCheck, async (req, res) => {
  const { sessionId, action, x, y, text, url, key } = req.body;
  const session = sessionManager.getSession(sessionId);

  if (!session || !session.page || session.page.isClosed()) {
    res.status(404).json({ error: "Active session not found or page closed" });
    return;
  }

  const page = session.page;

  try {
    if (action === "click" && typeof x === "number" && typeof y === "number") {
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
    } else if (action === "type" && typeof text === "string") {
      await page.keyboard.type(text, { delay: 150 });
      await page.waitForTimeout(500);
      if (/^\d{6}$/.test(text.trim())) {
        await page.keyboard.press("Enter").catch(() => undefined);
        await page.waitForTimeout(3000);
      }
    } else if (action === "press" && typeof key === "string") {
      await page.keyboard.press(key);
      await page.waitForTimeout(400);
    } else if (action === "navigate" && typeof url === "string") {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1000);
    }

    const screenshotBase64 = await sessionManager.captureScreenshot(sessionId);
    res.json({
      success: true,
      action,
      url: page.url(),
      screenshotBase64,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute action" });
  }
});

// Embedded Live Remote Control Web Interface
app.get("/control", (req, res) => {
  const token = req.query.token || "";
  const sessionId = req.query.sessionId || "";

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>ICARUS Live Remote Virtual Browser</title>
      <style>
        body { font-family: monospace; background: #0f0f11; color: #e1e1e6; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .viewport-container { border: 2px solid #333; border-radius: 8px; display: inline-block; cursor: crosshair; overflow: hidden; }
        img { display: block; max-width: 100%; height: auto; }
        .controls { margin-top: 15px; display: flex; gap: 10px; }
        input[type="text"] { background: #1a1a1e; border: 1px solid #333; color: #fff; padding: 8px 12px; border-radius: 4px; flex: 1; }
        button { background: #af9164; color: #000; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>⚡ ICARUS Live Remote Control Viewport</h2>
        <span id="status">Connecting WebSocket stream...</span>
      </div>

      <div class="viewport-container" id="viewport">
        <img id="screen" src="" alt="Live Remote Viewport Screen Stream" />
      </div>

      <div class="controls">
        <input type="text" id="textInput" placeholder="Type text to send to live virtual tab..." />
        <button id="sendBtn">Send Type</button>
        <button id="navInbox">Go to DMs</button>
        <button id="navFeed">Go to Feed</button>
      </div>

      <script>
        const token = "${token}";
        const sessionId = "${sessionId}";
        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = protocol + '//' + host + '/stream?sessionId=' + sessionId + '&token=' + token;

        const ws = new WebSocket(wsUrl);
        const img = document.getElementById('screen');
        const statusEl = document.getElementById('status');

        ws.onopen = () => { statusEl.textContent = '🟢 WebSocket Stream Active'; };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'frame' && data.image) {
            img.src = data.image;
          } else if (data.type === 'status') {
            statusEl.textContent = 'Info: ' + data.message;
          }
        };
        ws.onclose = () => { statusEl.textContent = '🔴 Stream Disconnected'; };

        img.addEventListener('click', (e) => {
          const rect = img.getBoundingClientRect();
          const scaleX = 1280 / rect.width;
          const scaleY = 800 / rect.height;
          const clickX = Math.round((e.clientX - rect.left) * scaleX);
          const clickY = Math.round((e.clientY - rect.top) * scaleY);
          ws.send(JSON.stringify({ type: 'click', x: clickX, y: clickY }));
        });

        document.getElementById('sendBtn').addEventListener('click', () => {
          const input = document.getElementById('textInput');
          if (input.value) {
            ws.send(JSON.stringify({ type: 'type', text: input.value }));
            input.value = '';
          }
        });

        document.getElementById('navInbox').addEventListener('click', () => {
          ws.send(JSON.stringify({ type: 'navigate', url: 'https://www.instagram.com/direct/inbox/' }));
        });
        document.getElementById('navFeed').addEventListener('click', () => {
          ws.send(JSON.stringify({ type: 'navigate', url: 'https://www.instagram.com/' }));
        });
      </script>
    </body>
    </html>
  `);
});

// WebSocket Server Upgrade handling for Live Streaming
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  if (url.pathname === "/stream") {
    const token = url.searchParams.get("token");
    if (token !== ADMIN_TOKEN) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket Real-time Frame Screencaster & Remote Input Dispatcher
wss.on("connection", (ws: WebSocket, request: http.IncomingMessage) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const sessionId = url.searchParams.get("sessionId") || "";

  console.log(`[runner/ws] Client connected to live stream for session: ${sessionId}`);

  let isAlive = true;
  ws.on("pong", () => {
    isAlive = true;
  });

  const heartbeat = setInterval(() => {
    if (!isAlive) {
      ws.terminate();
      clearInterval(heartbeat);
      return;
    }
    isAlive = false;
    ws.ping();
  }, 15000);

  // Screencast Frame Loop (10 FPS stream)
  const frameInterval = setInterval(async () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const base64 = await sessionManager.captureScreenshot(sessionId);
    if (base64) {
      ws.send(JSON.stringify({ type: "frame", image: base64 }));
    }
  }, 200);

  // Input Event Handler
  ws.on("message", async (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      const session = sessionManager.getSession(sessionId);
      if (!session || !session.page || session.page.isClosed()) return;

      const page = session.page;

      if (msg.type === "click" && typeof msg.x === "number" && typeof msg.y === "number") {
        await page.mouse.click(msg.x, msg.y);
      } else if (msg.type === "type" && typeof msg.text === "string") {
        await page.keyboard.type(msg.text, { delay: 50 });
      } else if (msg.type === "key" && typeof msg.key === "string") {
        await page.keyboard.press(msg.key);
      } else if (msg.type === "navigate" && typeof msg.url === "string") {
        await page.goto(msg.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      }
    } catch (err) {
      console.error("[runner/ws] Message handling error:", err);
    }
  });

  ws.on("close", () => {
    console.log(`[runner/ws] Stream closed for session: ${sessionId}`);
    clearInterval(frameInterval);
    clearInterval(heartbeat);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`
  =============================================================
  ⚡ ICARUS Virtual Browser Runner Service is LIVE!
  -------------------------------------------------------------
  • HTTP API & Health: http://localhost:${PORT}/health
  • Remote Control UI: http://localhost:${PORT}/control?token=${ADMIN_TOKEN}
  • WebSocket Stream:  ws://localhost:${PORT}/stream?token=${ADMIN_TOKEN}
  =============================================================
  `);
});
