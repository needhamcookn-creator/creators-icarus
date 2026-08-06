import { executeVirtualInstagramLogin } from "../lib/instagram-login";

async function run() {
  console.log("=== Testing local headful Instagram login ===");
  console.log("HEADLESS env var:", process.env.HEADLESS);
  const result = await executeVirtualInstagramLogin("nicky_nc07", "Ni300900!");
  console.log("Initial Result:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
