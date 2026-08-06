import { type BrowserContext, type Page, type Browser } from "playwright-core";

export interface ActiveSession {
  sessionId: string;
  username: string;
  password?: string;
  status: "logging_in" | "2fa_required" | "logged_in" | "failed";
  twoFactorHint?: string;
  lastScreenshotBase64?: string;
  lastUpdated: number;
  browserContext?: BrowserContext;
  page?: Page;
  browser?: Browser;
  cookies?: unknown[];
}

class SessionPool {
  private inMemory = new Map<string, ActiveSession>();

  async setSession(sessionId: string, session: ActiveSession) {
    this.inMemory.set(sessionId, session);

    // Sync serializable session state to Redis for serverless availability
    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
      try {
        const { Redis } = await import("@upstash/redis");
        const redis = new Redis({ url: redisUrl, token: redisToken });
        const redisPayload = {
          sessionId: session.sessionId,
          username: session.username,
          password: session.password,
          status: session.status,
          twoFactorHint: session.twoFactorHint,
          lastScreenshotBase64: session.lastScreenshotBase64,
          lastUpdated: session.lastUpdated,
          cookies: session.cookies,
        };
        await redis.set(`session:${sessionId}`, JSON.stringify(redisPayload), { ex: 86400 });
        await redis.sadd("sessions:all", sessionId);
      } catch (err) {
        console.error("[session-pool/redis] set error:", err);
      }
    }
  }

  async getSession(sessionId: string): Promise<ActiveSession | undefined> {
    if (this.inMemory.has(sessionId)) {
      return this.inMemory.get(sessionId);
    }

    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
      try {
        const { Redis } = await import("@upstash/redis");
        const redis = new Redis({ url: redisUrl, token: redisToken });
        const raw = await redis.get<string>(`session:${sessionId}`);
        if (raw) {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          return parsed as ActiveSession;
        }
      } catch (err) {
        console.error("[session-pool/redis] get error:", err);
      }
    }

    return undefined;
  }

  getSessionByUsername(username: string): ActiveSession | undefined {
    for (const session of this.inMemory.values()) {
      if (session.username.toLowerCase() === username.toLowerCase()) {
        return session;
      }
    }
    return undefined;
  }

  async getAllSessions(): Promise<ActiveSession[]> {
    const list = Array.from(this.inMemory.values());

    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
      try {
        const { Redis } = await import("@upstash/redis");
        const redis = new Redis({ url: redisUrl, token: redisToken });
        const ids = await redis.smembers("sessions:all");
        if (ids && ids.length > 0) {
          for (const id of ids) {
            if (!this.inMemory.has(id)) {
              const raw = await redis.get<string>(`session:${id}`);
              if (raw) {
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                list.push(parsed as ActiveSession);
              }
            }
          }
        }
      } catch (err) {
        console.error("[session-pool/redis] getAll error:", err);
      }
    }

    return list;
  }

  /** Merge partial fields into an existing session and re-sync to Redis. */
  async patchSession(sessionId: string, patch: Partial<Omit<ActiveSession, "sessionId">>) {
    const existing = this.inMemory.get(sessionId);
    if (!existing) {
      // Session only exists in Redis (cold start) and has no live browser
      // assets; there is nothing meaningful to patch for the admin view.
      return;
    }
    Object.assign(existing, patch);
    await this.setSession(sessionId, existing);
  }

  async closeSession(sessionId: string) {
    const session = this.inMemory.get(sessionId);
    if (session) {
      try {
        if (session.browserContext) await session.browserContext.close();
        if (session.browser) await session.browser.close();
      } catch {
        // Ignore
      }
      this.inMemory.delete(sessionId);
    }
  }
}

const globalForPool = globalThis as unknown as { sessionPool?: SessionPool };
export const activeSessionPool = globalForPool.sessionPool ?? new SessionPool();
if (process.env.NODE_ENV !== "production") globalForPool.sessionPool = activeSessionPool;
