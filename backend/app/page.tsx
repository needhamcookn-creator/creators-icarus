export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        color: "#121212",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>ICARUS Creator Portal Backend</h1>
      <p style={{ maxWidth: "600px", lineHeight: 1.6, color: "#555" }}>
        This subdomain hosts the tracking and analytics API for the ICARUS creator portal.
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          marginTop: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <li>
          <code>POST /api/track</code> — record a page view or connect click
        </li>
        <li>
          <code>GET /api/track?event=page_view</code> — 1×1 tracking pixel
        </li>
        <li>
          <code>GET /api/health</code> — health check
        </li>
        <li>
          <code>GET /api/admin/visits</code> — view tracked visits (token required)
        </li>
      </ul>
    </main>
  );
}
