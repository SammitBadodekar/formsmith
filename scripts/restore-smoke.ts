import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../apps/api/node_modules/drizzle-orm/postgres-js/migrator";
import { connectDatabase } from "../apps/api/src/db";
import { integrations, jobs, submissions, user } from "../apps/api/src/db/schema";
import { repository } from "../apps/api/src/repository";
import { createForm, createQuestion, hashPayload, newId, text } from "../packages/core/src";
import type { JournalEntry } from "../packages/core/src/intake";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || !["54329", "54330"].includes(url.port))
  throw new Error("Use the isolated local integration PostgreSQL server");
const temporary = await mkdtemp(join(tmpdir(), "formsmith-restore-"));
const suffix = newId().replaceAll("-", ""),
  names = [`fs_backup_${suffix}`, `fs_restore_${suffix}`];
const admin = connectDatabase(url.href, 1),
  connections: ReturnType<typeof connectDatabase>[] = [];
async function pg(
  command: "pg_dump" | "pg_restore",
  database: string,
  args: string[],
  archive: string,
) {
  const executable = process.env[command === "pg_dump" ? "PG_DUMP" : "PG_RESTORE"] ?? command;
  // CI uses the database container's matching client tools; local runs use PATH
  // or explicit PG_DUMP/PG_RESTORE paths. Stream the archive across the boundary.
  const invocation = process.env.PG_CONTAINER
    ? [
        "docker",
        "exec",
        "-i",
        "-e",
        "PGHOST=127.0.0.1",
        "-e",
        "PGPORT=5432",
        "-e",
        "PGUSER",
        "-e",
        "PGPASSWORD",
        "-e",
        "PGDATABASE",
        process.env.PG_CONTAINER,
        command,
      ]
    : [executable];
  const child = Bun.spawn([...invocation, ...args], {
    env: {
      ...Bun.env,
      PGHOST: url.hostname,
      PGPORT: url.port,
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: database,
    },
    stdin: command === "pg_restore" ? Bun.file(archive) : "ignore",
    stdout: command === "pg_dump" ? Bun.file(archive) : "ignore",
    stderr: "pipe",
  });
  const [result, error] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  if (result !== 0) throw new Error(`${command} failed: ${error}`);
}
try {
  for (const name of names) {
    await admin.client.unsafe(`CREATE DATABASE "${name}"`);
    const databaseUrl = new URL(url);
    databaseUrl.pathname = `/${name}`;
    connections.push(connectDatabase(databaseUrl.href, 2));
  }
  const [source, restored] = connections;
  assert.ok(source && restored);
  await migrate(source.db, { migrationsFolder: "apps/api/drizzle" });
  const repo = repository(source.db),
    ownerId = newId();
  await source.db.insert(user).values({
    id: ownerId,
    name: "Restore fixture",
    email: `${ownerId}@example.invalid`,
    emailVerified: true,
  });
  const draft = createForm(),
    question = { ...createQuestion("short_text"), label: text("Name"), required: true };
  draft.blocks = [question];
  const form = await repo.create(ownerId, draft);
  assert.ok(form);
  const published = await repo.publish(ownerId, form.id, form.revision);
  await source.db.insert(integrations).values({
    formId: form.id,
    kind: "webhook",
    name: "Restore test",
    config: { url: "https://example.invalid/hook" },
  });
  const backup = join(temporary, "before-responses.dump");
  await pg("pg_dump", names[0] as string, ["--format=custom", "--no-owner"], backup);
  const journal: JournalEntry[] = [];
  for (let i = 0; i < 5; i++) {
    const command = {
      formId: form.id,
      versionId: published.versionId,
      attemptId: newId(),
      answers: { [question.id]: `Respondent ${i}` },
      honeypot: "",
    };
    journal.push({
      protocolVersion: 1,
      receiptId: newId(),
      receivedAt: new Date().toISOString(),
      requestHash: await hashPayload(command),
      definitionHash: await hashPayload(form.draft),
      command,
    });
  }
  const original = await Promise.all(journal.map((entry) => repo.commit(entry)));
  await pg(
    "pg_restore",
    names[1] as string,
    ["--no-owner", "--exit-on-error", `--dbname=${names[1]}`],
    backup,
  );
  assert.equal((await restored.db.select().from(submissions)).length, 0);
  const restoredRepo = repository(restored.db);
  const replayed = await Promise.all(
    [...journal, ...journal].map((entry) => restoredRepo.commit(entry)),
  );
  assert.deepEqual(
    new Set(replayed.map((r) => r.submissionId)),
    new Set(original.map((r) => r.submissionId)),
  );
  const responses = await restored.db.select().from(submissions);
  assert.equal(responses.length, journal.length);
  for (const entry of journal)
    assert.deepEqual(
      responses.find((r) => r.receiptId === entry.receiptId)?.answers,
      entry.command.answers,
    );
  const deliveries = (await restored.db.select().from(jobs)).filter(
    (job) => job.kind === "webhook",
  );
  assert.equal(deliveries.length, journal.length);
  assert.deepEqual(
    new Set(deliveries.map((job) => job.payload.eventId)),
    new Set(original.map((r) => r.submissionId)),
  );
  console.log(
    "Restore smoke passed: backup before responses, restore into a new database, duplicate journal replay, all answers and stable event IDs recovered exactly once.",
  );
} finally {
  for (const connection of connections) await connection.client.end();
  for (const name of names) await admin.client.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.client.end();
  await rm(temporary, { recursive: true, force: true });
}
