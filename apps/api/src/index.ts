import { createApp } from "./app";
import { loadConfig } from "./config";
import { connectDatabase } from "./db";

const config = loadConfig();
const { db, client } = connectDatabase(config.DATABASE_URL, config.DB_POOL_SIZE);
const app = (await createApp(db, config)).listen({
  port: config.PORT,
  hostname: "0.0.0.0",
  maxRequestBodySize: 1024 * 1024,
  idleTimeout: 30,
});
console.log(JSON.stringify({ event: "api.started", port: config.PORT }));
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await app.stop(false);
  await client.end({ timeout: 10 });
}
process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});
