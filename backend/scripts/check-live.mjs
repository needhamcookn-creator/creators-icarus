const BASE = "https://backend-smoky-eight-83.vercel.app";
const TOKEN = "xrpxrpxrp";

let lastEventId = null;

async function poll() {
  try {
    const visits = await fetch(`${BASE}/api/admin/visits?token=${TOKEN}`).then(r => r.json());
    if (visits.events && visits.events.length > 0) {
      const latest = visits.events[0];
      if (latest.id !== lastEventId) {
        lastEventId = latest.id;
        console.log(`\n[NEW EVENT ${new Date(latest.timestamp).toLocaleTimeString()}] ${latest.event}`);
        console.log("IP:", latest.ip);
        console.log("Metadata:", JSON.stringify(latest.metadata, null, 2));
      }
    }
  } catch (err) {
    // ignore fetch errors
  }
}

console.log("Monitoring live backend events at https://backend-smoky-eight-83.vercel.app ...");
setInterval(poll, 2000);
poll();
