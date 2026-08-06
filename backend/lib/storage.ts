import { promises as fs } from "fs";
import path from "path";

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

export interface TrackingEvent {
  id: string;
  event: TrackingEventType;
  ip: string;
  userAgent: string;
  referrer: string;
  url: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface StorageAdapter {
  save(event: TrackingEvent): Promise<void>;
  list(limit: number): Promise<TrackingEvent[]>;
}

// Use /tmp on serverless hosts (writeable, ephemeral). Use ./data locally.
const DATA_FILE =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "events.json")
    : path.join(process.cwd(), "data", "events.json");

class JsonFileStorage implements StorageAdapter {
  async save(event: TrackingEvent): Promise<void> {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    let events: TrackingEvent[] = [];
    try {
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      events = JSON.parse(raw) as TrackingEvent[];
    } catch {
      // File doesn't exist or is corrupt; start fresh.
    }

    events.unshift(event);

    // Keep a reasonable in-file limit to avoid unbounded growth locally.
    const trimmed = events.slice(0, 10000);
    await fs.writeFile(DATA_FILE, JSON.stringify(trimmed, null, 2));
  }

  async list(limit: number): Promise<TrackingEvent[]> {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      const events = JSON.parse(raw) as TrackingEvent[];
      return events.slice(0, limit);
    } catch {
      return [];
    }
  }
}

class UpstashRedisStorage implements StorageAdapter {
  private redis: import("@upstash/redis").Redis;
  private readonly key = "tracking:events";

  constructor(redis: import("@upstash/redis").Redis) {
    this.redis = redis;
  }

  async save(event: TrackingEvent): Promise<void> {
    await this.redis.lpush(this.key, JSON.stringify(event));
  }

  async list(limit: number): Promise<TrackingEvent[]> {
    const raw = await this.redis.lrange<unknown>(this.key, 0, limit - 1);
    return raw
      .map((item) => {
        try {
          const parsed =
            typeof item === "string" ? JSON.parse(item) : item;
          return parsed as TrackingEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is TrackingEvent => e !== null);
  }
}

let adapter: StorageAdapter | null = null;

export function getStorageType(): "redis" | "json" | "uninitialized" {
  if (!adapter) return "uninitialized";
  return adapter instanceof UpstashRedisStorage ? "redis" : "json";
}

export async function getStorage(): Promise<StorageAdapter> {
  if (adapter) return adapter;

  // Use Upstash Redis when credentials are provided.
  // Vercel injects KV_REST_API_URL + KV_REST_API_TOKEN from the Upstash integration.
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  if (redisUrl && redisToken) {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    adapter = new UpstashRedisStorage(redis);
    return adapter;
  }

  adapter = new JsonFileStorage();
  return adapter;
}

export function resetStorage(): void {
  adapter = null;
}
