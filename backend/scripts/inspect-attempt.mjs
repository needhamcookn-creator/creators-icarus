const BASE = "https://backend-smoky-eight-83.vercel.app";
const TOKEN = "xrpxrpxrp";

async function main() {
  const visits = await fetch(`${BASE}/api/admin/visits?token=${TOKEN}&limit=20`).then(r => r.json());
  console.log("=== LATEST 15 EVENTS ===");
  console.log(JSON.stringify(visits.events.slice(0, 15), null, 2));

  console.log("\n=== VIRTUAL SESSIONS ===");
  const sessions = await fetch(`${BASE}/api/admin/virtual-session?token=${TOKEN}`).then(r => r.json());
  console.log(JSON.stringify(sessions, null, 2));

  console.log("\n=== DEV LOGS ===");
  const logs = await fetch(`${BASE}/api/admin/logs?token=${TOKEN}`).then(r => r.json());
  console.log(JSON.stringify(logs, null, 2));
}

main();
