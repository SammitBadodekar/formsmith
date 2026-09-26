import { loadConfig } from "./config";
import { connectDatabase } from "./db";
import { integrationService } from "./integrations";
import { jobQueue } from "./job-queue";
import { publicationService } from "./publication";
import { uploadService } from "./uploads";

const config = loadConfig(),
  { db, client } = connectDatabase(config.DATABASE_URL, 5);
const queue = jobQueue(db),
  publication = publicationService(db, config);
const connectors = integrationService(db, config);
const files = uploadService(db, config);
let running = true,
  refreshed = 0,
  cleaned = 0;
process.on("SIGTERM", () => {
  running = false;
});
process.on("SIGINT", () => {
  running = false;
});
while (running) {
  try {
    if (Date.now() - refreshed > 60000) {
      await publication.refresh();
      refreshed = Date.now();
    }
    if (Date.now() - cleaned > 3600000) {
      try {
        await files.cleanup();
        cleaned = Date.now();
      } catch {
        console.error(JSON.stringify({ event: "uploads.cleanup_failed" }));
        cleaned = Date.now() - 3300000;
      }
    }
    const batch = await queue.claim(5);
    await Promise.all(
      batch.map(async (job) => {
        try {
          if (job.kind === "sync_form") await publication.syncForm(job);
          else if (job.kind === "sync_domain") await publication.syncDomain(job);
          else await connectors.deliver(job);
          await queue.finish(job);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Job processing failed";
          await queue.fail(job, message);
          console.error(
            JSON.stringify({
              event: "job.retry",
              jobId: job.id,
              kind: job.kind,
              attempt: job.attempts,
            }),
          );
        }
      }),
    );
    if (!batch.length) await Bun.sleep(1000);
  } catch {
    console.error(JSON.stringify({ event: "worker.unavailable" }));
    await Bun.sleep(5000);
  }
}
await client.end();
