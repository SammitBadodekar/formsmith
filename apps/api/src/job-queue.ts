import { newId } from "@formsmith/core";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "./db";
import { jobs } from "./db/schema";
export type Job = typeof jobs.$inferSelect;
export type JobHandler = (job: Job) => Promise<void>;
export function jobQueue(db: Database) {
  return {
    async claim(limit = 5, leaseMs = 120000): Promise<Job[]> {
      return db.transaction(async (tx) => {
        const ready = await tx
          .select()
          .from(jobs)
          .where(
            and(
              isNull(jobs.completedAt),
              isNull(jobs.failedAt),
              sql`${jobs.availableAt} <= now()`,
              sql`(${jobs.leaseUntil} is null or ${jobs.leaseUntil} < now())`,
            ),
          )
          .orderBy(jobs.availableAt)
          .limit(limit)
          .for("update", { skipLocked: true });
        const claimed: Job[] = [];
        for (const job of ready) {
          const [next] = await tx
            .update(jobs)
            .set({
              leaseToken: newId(),
              leaseUntil: new Date(Date.now() + leaseMs),
              attempts: sql`${jobs.attempts} + 1`,
            })
            .where(eq(jobs.id, job.id))
            .returning();
          if (next) claimed.push(next);
        }
        return claimed;
      });
    },
    async finish(job: Job) {
      if (!job.leaseToken) throw new Error("Missing lease token");
      await db
        .update(jobs)
        .set({ completedAt: new Date(), leaseUntil: null, leaseToken: null, lastError: null })
        .where(and(eq(jobs.id, job.id), eq(jobs.leaseToken, job.leaseToken)));
    },
    async fail(job: Job, message: string) {
      if (!job.leaseToken) throw new Error("Missing lease token");
      const delay =
        Math.min(3600000, 1000 * 2 ** Math.min(job.attempts, 12)) +
        Math.floor(Math.random() * 1000);
      await db
        .update(jobs)
        .set({
          availableAt: new Date(Date.now() + delay),
          leaseToken: null,
          leaseUntil: null,
          lastError: message.slice(0, 500),
          failedAt: job.attempts >= 20 ? new Date() : null,
        })
        .where(and(eq(jobs.id, job.id), eq(jobs.leaseToken, job.leaseToken)));
    },
  };
}
