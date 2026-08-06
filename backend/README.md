# ICARUS Creator Portal — Backend

API-only Next.js app for tracking and analytics. Intended to run on a subdomain such as `api.creators-icaruswick.com`.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/track` | Record an event (`page_view` or `connect_instagram_click`). |
| `GET` | `/api/track?event=page_view` | 1×1 transparent tracking pixel. |
| `GET` | `/api/health` | Health check. |
| `GET` | `/api/admin/visits?token=…` | Fetch tracked events (requires `ADMIN_TOKEN`). |

## Local development

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:3001`.

Frontend (on `http://localhost:3000`) is already allowed by default.

## Environment variables

Create a `.env.local` file:

```env
# Required for admin endpoints
ADMIN_TOKEN=your-secret-token

# Optional: restrict CORS origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://creators-icaruswick.com

# Optional: use Upstash Redis for persistent storage in production.
# If omitted, events are written to ./data/events.json (ephemeral on serverless hosts).
UPSTASH_REDIS_REST_URL=https://...-upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

## Storage

- **Local/dev**: JSON file at `./data/events.json`.
- **Production (recommended)**: Vercel KV. Set `KV_URL` and `KV_REST_API_TOKEN`.

## Deployment

Deploy this folder as a separate Vercel project and assign it a subdomain such as `api.creators-icaruswick.com`.

```bash
npx vercel --yes --prod
```

Then set the frontend environment variable:

```env
NEXT_PUBLIC_BACKEND_URL=https://api.creators-icaruswick.com
```
