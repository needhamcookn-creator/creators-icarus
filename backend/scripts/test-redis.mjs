import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function main() {
  console.log("ping:", await redis.ping());
  await redis.del("tracking:events");
  await redis.lpush("tracking:events", JSON.stringify({ id: "test-1", event: "page_view" }));
  await redis.lpush("tracking:events", JSON.stringify({ id: "test-2", event: "connect_instagram_click" }));
  const items = await redis.lrange("tracking:events", 0, 9);
  console.log("items:", items);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
