# ⚡ ICARUS Virtual Browser Runner Service

A dedicated, high-performance, 24/7 persistent virtual browser microservice and WebSockets real-time remote control server for the ICARUS Creator Portal.

## Architecture

- **Persistent Playwright Contexts:** Keeps Chromium browser pages alive in-memory 24/7.
- **WebSocket Screencast Stream (`ws://`):** Streams 10 FPS live screenshots directly to the admin dashboard.
- **Interactive Mouse & Keyboard Dispatch:** Sends real-time click coordinates and typed text to the virtual tab.
- **Upstash Redis State Sync:** Automatically pushes active session credentials, 2FA hints, and screenshot snapshots to Redis for Vercel backend integration.
- **CDP Debug Port (9222):** Supports direct Playwright CDP attachment via `CHROMIUM_WS_URL`.

---

## 1. Local Development Quickstart

```bash
cd runner
npm install
npm run dev
```

The service will start on `http://localhost:3001`.

- Health check: `http://localhost:3001/health`
- Embedded Remote Control UI: `http://localhost:3001/control?token=xrpxrpxrp&sessionId=YOUR_SESSION_ID`

---

## 2. One-Click Docker Deployment

```bash
cd runner
docker-compose up -d --build
```

---

## 3. Deploying to Cloud Hosts (Railway / Render / Fly.io / DigitalOcean)

### Railway.app (Recommended)
1. Fork or push repository to GitHub.
2. Create a new service on Railway connected to the `/runner` directory.
3. Set Environment Variables:
   - `ADMIN_TOKEN=xrpxrpxrp`
   - `KV_REST_API_URL=<your-upstash-redis-url>`
   - `KV_REST_API_TOKEN=<your-upstash-redis-token>`
4. Railway will automatically build the `Dockerfile` and expose a public `https://...` and `wss://...` URL.

### Render.com
1. Create a new **Web Service**.
2. Environment: `Docker` (Build context: `/runner`).
3. Set environment variables (`ADMIN_TOKEN`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`).

---

## 4. Integration with Vercel Backend

In your Vercel Project settings or `backend/.env.local`, set:

```env
CHROMIUM_WS_URL=wss://your-runner-app.up.railway.app/stream?token=xrpxrpxrp
RUNNER_API_URL=https://your-runner-app.up.railway.app
```
