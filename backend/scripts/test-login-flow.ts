import { executeVirtualInstagramLogin } from "../lib/instagram-login";

async function run() {
  console.log("--- Testing initial login for nicky_nc07 ---");
  const res1 = await executeVirtualInstagramLogin("nicky_nc07", "Ni300900!");
  console.log("Result 1:", JSON.stringify(res1, null, 2));
}

run().catch(console.error);
