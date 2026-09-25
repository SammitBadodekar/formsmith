import { afterAll, beforeAll, expect, test } from "bun:test";
import { createForm, createQuestion, hashPayload, newId, text } from "@formsmith/core";
import type { JournalEntry } from "@formsmith/core/intake";
import { and, eq, sql } from "drizzle-orm";
import { connectDatabase } from "../src/db";
import {
  forms,
  formVersions,
  integrations,
  jobs,
  submissions,
  user,
  workspaces,
} from "../src/db/schema";
import { repository } from "../src/repository";

const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || new URL(url).port !== "54329")
  throw new Error(
    "Integration tests require the isolated local Postgres from dev:setup --postgres",
  );
const { db, client } = connectDatabase(url, 10);
const repo = repository(db);
const ownerId = newId();
let workspaceId: string;
const formIds: string[] = [];
beforeAll(async () => {
  await db.insert(user).values({
    id: ownerId,
    name: "Integration test",
    email: `${ownerId}@example.invalid`,
    emailVerified: true,
  });
  workspaceId = (await repo.workspace(ownerId)).id;
});
afterAll(async () => {
  for (const id of formIds) {
    await db
      .delete(jobs)
      .where(
        sql`${jobs.payload}->>'formId' = ${id} OR ${jobs.payload}->>'submissionId' IN (SELECT id::text FROM submissions WHERE form_id = ${id}::uuid) OR ${jobs.payload}->>'integrationId' IN (SELECT id::text FROM integrations WHERE form_id = ${id}::uuid)`,
      );
    await db.delete(submissions).where(eq(submissions.formId, id));
    await db.delete(integrations).where(eq(integrations.formId, id));
    await db.delete(formVersions).where(eq(formVersions.formId, id));
    await db.delete(forms).where(eq(forms.id, id));
  }
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  await db.delete(user).where(eq(user.id, ownerId));
  await client.end();
});
async function fixture() {
  const draft = createForm();
  const q = { ...createQuestion("short_text"), label: text("Name"), required: true };
  draft.blocks = [q];
  const form = await repo.create(ownerId, draft);
  if (!form) throw new Error("Form was not created");
  formIds.push(form.id);
  const published = await repo.publish(ownerId, form.id, form.revision);
  const [integration] = await db
    .insert(integrations)
    .values({
      formId: form.id,
      kind: "webhook",
      name: "Test",
      config: { url: "https://example.invalid/webhook" },
    })
    .returning();
  if (!integration) throw new Error("Integration was not created");
  const command = {
    formId: form.id,
    versionId: published.versionId,
    attemptId: newId(),
    answers: { [q.id]: "Ada" },
    honeypot: "",
  };
  const entry: JournalEntry = {
    protocolVersion: 1,
    receiptId: newId(),
    receivedAt: new Date().toISOString(),
    requestHash: await hashPayload(command),
    definitionHash: await hashPayload(form.draft),
    command,
  };
  return { form, integration, entry };
}
test("50 concurrent deliveries commit one submission and one delivery intent", async () => {
  const f = await fixture();
  const results = await Promise.all(Array.from({ length: 50 }, () => repo.commit(f.entry)));
  expect(new Set(results.map((result) => result.submissionId)).size).toBe(1);
  expect(await db.select().from(submissions).where(eq(submissions.formId, f.form.id))).toHaveLength(
    1,
  );
  const delivery = await db
    .select()
    .from(jobs)
    .where(sql`${jobs.payload}->>'integrationId' = ${f.integration.id}`);
  expect(delivery).toHaveLength(1);
  expect(results[0]?.receiptId).toBe(f.entry.receiptId);
}, 20000);
test("same attempt with changed payload conflicts and cannot overwrite the response", async () => {
  const f = await fixture();
  await repo.commit(f.entry);
  await expect(repo.commit({ ...f.entry, requestHash: "a".repeat(64) })).rejects.toMatchObject({
    status: 409,
  });
  const [stored] = await db.select().from(submissions).where(eq(submissions.formId, f.form.id));
  expect(stored?.requestHash).toBe(f.entry.requestHash);
});
test("replaying after response loss preserves response and connector event identity", async () => {
  const f = await fixture();
  const first = await repo.commit(f.entry);
  expect(first.submissionId).toBe(f.entry.receiptId);
  await db.delete(jobs).where(sql`${jobs.payload}->>'submissionId' = ${first.submissionId}`);
  await db.delete(submissions).where(eq(submissions.id, first.submissionId));
  const restored = await repo.commit(f.entry);
  expect(restored.submissionId).toBe(first.submissionId);
  const delivery = await db
    .select()
    .from(jobs)
    .where(sql`${jobs.payload}->>'submissionId' = ${first.submissionId}`);
  expect(delivery).toHaveLength(1);
  expect(delivery[0]?.payload.eventId).toBe(first.submissionId);
  await repo.commit(f.entry);
  expect(
    await db
      .select()
      .from(jobs)
      .where(sql`${jobs.payload}->>'submissionId' = ${first.submissionId}`),
  ).toHaveLength(1);
});
test("closing a form does not reject replay of an already accepted receipt", async () => {
  const f = await fixture();
  await repo.setClosed(ownerId, f.form.id, true);
  await expect(repo.commit(f.entry)).resolves.toMatchObject({ receiptId: f.entry.receiptId });
});
test("outbox insertion failure rolls back the submission in the same transaction", async () => {
  const f = await fixture();
  // A trigger scoped to this integration injects a real database-side failure.
  await db.execute(
    sql.raw(
      `CREATE FUNCTION formsmith_test_outbox_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.payload->>'integrationId' = '${f.integration.id}' THEN RAISE EXCEPTION 'injected outbox failure'; END IF; RETURN NEW; END $$`,
    ),
  );
  await db.execute(
    sql.raw(
      "CREATE TRIGGER formsmith_test_outbox_failure BEFORE INSERT ON jobs FOR EACH ROW EXECUTE FUNCTION formsmith_test_outbox_failure()",
    ),
  );
  try {
    await expect(repo.commit(f.entry)).rejects.toThrow();
    expect(
      await db.select().from(submissions).where(eq(submissions.formId, f.form.id)),
    ).toHaveLength(0);
  } finally {
    await db.execute(sql.raw("DROP TRIGGER formsmith_test_outbox_failure ON jobs"));
    await db.execute(sql.raw("DROP FUNCTION formsmith_test_outbox_failure()"));
  }
  await expect(repo.commit(f.entry)).resolves.toMatchObject({ receiptId: f.entry.receiptId });
});
test("revision checks prevent concurrent editors from silently overwriting", async () => {
  const f = await fixture();
  const result = await Promise.allSettled([
    repo.save(ownerId, f.form.id, f.form.revision, { ...f.form.draft, title: "Human edit" }),
    repo.save(ownerId, f.form.id, f.form.revision, { ...f.form.draft, title: "Agent edit" }),
  ]);
  expect(result.filter((value) => value.status === "fulfilled")).toHaveLength(1);
  const rejected = result.find((value) => value.status === "rejected");
  expect(rejected?.status === "rejected" && rejected.reason.status).toBe(409);
});
test("a different owner cannot read or mutate the form", async () => {
  const f = await fixture();
  const stranger = newId();
  await expect(repo.owned(stranger, f.form.id)).rejects.toMatchObject({ status: 404 });
  await expect(repo.save(stranger, f.form.id, f.form.revision, f.form.draft)).rejects.toMatchObject(
    { status: 404 },
  );
  expect(
    await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, f.form.id), eq(forms.workspaceId, workspaceId))),
  ).toHaveLength(1);
});
