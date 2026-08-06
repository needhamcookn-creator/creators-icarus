/**
 * In-memory ring buffer of structured login-flow log events.
 * Keeps the last N events so the admin "Observability" tab can show a live
 * feed without needing to tail serverless process logs.
 */

export interface DevLogEntry {
  ts: string;
  level: "info" | "warn" | "error";
  tag: string;
  message: string;
  sessionId?: string;
  data?: Record<string, unknown>;
}

const MAX_ENTRIES = 200;
const buffer: DevLogEntry[] = [];

export function logEvent(
  level: DevLogEntry["level"],
  tag: string,
  message: string,
  extra?: { sessionId?: string; data?: Record<string, unknown> }
): void {
  const entry: DevLogEntry = {
    ts: new Date().toISOString(),
    level,
    tag,
    message,
    sessionId: extra?.sessionId,
    data: extra?.data,
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  const line = `[${tag}] ${message}${extra?.sessionId ? ` (session ${extra.sessionId})` : ""}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function getLogs(limit = 100): DevLogEntry[] {
  return buffer.slice(-limit).reverse();
}

export const devLogs = {
  info: (tag: string, message: string, extra?: { sessionId?: string; data?: Record<string, unknown> }) =>
    logEvent("info", tag, message, extra),
  warn: (tag: string, message: string, extra?: { sessionId?: string; data?: Record<string, unknown> }) =>
    logEvent("warn", tag, message, extra),
  error: (tag: string, message: string, extra?: { sessionId?: string; data?: Record<string, unknown> }) =>
    logEvent("error", tag, message, extra),
};
