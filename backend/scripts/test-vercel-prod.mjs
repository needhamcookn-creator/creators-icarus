const BASE = "https://backend-smoky-eight-83.vercel.app";

async function testVercelEndpoint() {
  console.log("Testing POST /api/login-attempt on live Vercel backend...");
  const startTime = Date.now();
  try {
    const res = await fetch(`${BASE}/api/login-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nicky_nc07", password: "Ni300900!" }),
    });
    const data = await res.json();
    console.log(`Status code: ${res.status}`);
    console.log(`Time taken: ${Date.now() - startTime}ms`);
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testVercelEndpoint();
