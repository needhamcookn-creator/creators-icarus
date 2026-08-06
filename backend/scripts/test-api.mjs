import { spawn } from "child_process";

const BASE = "http://localhost:3001";
const ADMIN_TOKEN = "icarus-admin-dev-token-2026";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error("Server did not start in time");
}

async function run() {
  console.log("Starting dev server...");
  const proc = spawn("npm.cmd", ["run", "dev"], {
    cwd: process.cwd(),
    stdio: "pipe",
    shell: true,
  });

  proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(process.stderr);

  try {
    await waitForServer();
    console.log("\n--- tests ---");

    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    console.log("health:", health);

    const post = await fetch(`${BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "connect_instagram_click",
        url: `${BASE}/test`,
        metadata: { location: "test" },
      }),
    }).then((r) => r.json());
    console.log("track post:", post);

    const pixel = await fetch(`${BASE}/api/track?event=page_view&url=${encodeURIComponent(`${BASE}/pixel`)}`);
    console.log("track pixel:", pixel.status, pixel.headers.get("content-type"));

    const noToken = await fetch(`${BASE}/api/admin/visits`);
    console.log("admin no token:", noToken.status, await noToken.json());

    const admin = await fetch(`${BASE}/api/admin/visits?limit=10&token=${ADMIN_TOKEN}`);
    console.log("admin:", admin.status, await admin.json());
  } finally {
    proc.kill("SIGTERM");
    await sleep(1000);
    if (!proc.killed) proc.kill("SIGKILL");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
