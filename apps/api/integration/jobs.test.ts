import { afterAll, expect, test } from "bun:test";
import { newId } from "@formsmith/core";
import { eq, inArray } from "drizzle-orm";
import { connectDatabase } from "../src/db";
import { jobs } from "../src/db/schema";
import { jobQueue } from "../src/job-queue";

const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || new URL(url).port !== "54329")
  throw new Error("Use the isolated integration database");
const { db, client } = connectDatabase(url, 5),
  queue = jobQueue(db),
  ids: string[] = [];
afterAll(async () => {
  if (ids.length) await db.delete(jobs).where(inArray(jobs.id, ids));
  await client.end();
});
async function fixture() {
  const [job] = await db
    .insert(jobs)
    .values({
      dedupeKey: `lease-test:${newId()}`,
      kind: "sync_form",
      payload: {},
      availableAt: new Date(0),
    })
    .returning();
  if (!job) throw new Error("Fixture missing");
  ids.push(job.id);
  return job;
}
test("two concurrent consumers cannot claim the same live lease", async () => {
  const job = await fixture();
  const claims = (await Promise.all([queue.claim(1), queue.claim(1)]))
    .flat()
    .filter((claimed) => claimed.id === job.id);
  expect(claims).toHaveLength(1);
  expect(claims[0]?.leaseToken).toBeTruthy();
});
test("an expired worker cannot acknowledge or fail a newer worker's lease", async () => {
  const job = await fixture();
  const first = (await queue.claim(1))[0];
  if (first?.id !== job.id) throw new Error("Test requires no other due jobs");
  await db
    .update(jobs)
    .set({ leaseUntil: new Date(0) })
    .where(eq(jobs.id, job.id));
  const second = (await queue.claim(1))[0];
  if (second?.id !== job.id) throw new Error("Lease was not recovered");
  expect(first.leaseToken).not.toBe(second.leaseToken);
  await queue.finish(first);
  await queue.fail(first, "stale failure");
  const [current] = await db.select().from(jobs).where(eq(jobs.id, job.id));
  expect(current?.completedAt).toBeNull();
  expect(current?.leaseToken).toBe(second.leaseToken);
  expect(current?.lastError).toBeNull();
  await queue.finish(second);
  const [done] = await db.select().from(jobs).where(eq(jobs.id, job.id));
  expect(done?.completedAt).not.toBeNull();
});
