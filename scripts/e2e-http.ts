import assert from "node:assert/strict";
import { chmod } from "node:fs/promises";
import { eq, sql } from "../apps/api/node_modules/drizzle-orm";
import { connectDatabase } from "../apps/api/src/db";
import {
  forms,
  formVersions,
  jobs,
  machineCredentials,
  submissions,
  user,
  workspaces,
} from "../apps/api/src/db/schema";
import { createForm, createQuestion, hashPayload, newId, text } from "../packages/core/src";

const databaseUrl = process.env.DATABASE_URL;
if (
  !databaseUrl ||
  new URL(databaseUrl).hostname !== "127.0.0.1" ||
  new URL(databaseUrl).port !== "54329"
)
  throw new Error("Use the isolated local database");
const { db, client } = connectDatabase(databaseUrl, 2);
const origin = "http://127.0.0.1:5173",
  intake = `${origin}/intake`,
  ownerId = newId(),
  token = `fs_${newId()}${newId()}`;
let formId: string | undefined;
async function call(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${origin}/api${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: await response.json() };
}
async function until(fn: () => Promise<boolean>, message: string) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await Bun.sleep(200);
  }
  throw new Error(message);
}
try {
  await db.insert(user).values({
    id: ownerId,
    name: "HTTP end-to-end fixture",
    email: `${ownerId}@example.invalid`,
    emailVerified: true,
  });
  await db.insert(machineCredentials).values({
    ownerId,
    name: "HTTP test",
    tokenHash: await hashPayload(token),
    scopes: ["forms:read", "forms:write", "forms:publish", "submissions:read"],
    expiresAt: new Date(Date.now() + 3600000),
  });
  const draft = createForm(),
    email = { ...createQuestion("email"), label: text("Your email"), required: true },
    rating = {
      ...createQuestion("rating"),
      label: text("How was your experience?"),
      required: true,
    };
  draft.title = "Product feedback";
  draft.blocks = [email, rating];
  const created = await call("/forms", "POST", { definition: draft });
  assert.equal(created.response.status, 201);
  formId = created.data.id;
  assert.equal(
    (await call(`/forms/${formId}/publish`, "POST", { revision: created.data.revision })).response
      .status,
    202,
  );
  await until(async () => {
    const { data } = await call(`/forms/${formId}`);
    return data.syncedPolicyRevision === data.policyRevision;
  }, "Publication did not synchronize; start the API job worker");
  const publicPage = await fetch(`${origin}/f/${formId}`);
  assert.equal(publicPage.status, 200);
  assert.ok((await publicPage.text()).includes("/f/src/main.tsx"));
  const started = await fetch(`${intake}/forms/${formId}/attempts`, {
    method: "POST",
    headers: { origin },
    body: "{}",
  });
  assert.equal(started.status, 201);
  const attempt = await started.json();
  const command = {
    formId,
    versionId: attempt.versionId,
    attemptId: attempt.attemptId,
    answers: { [email.id]: "qa@example.com", [rating.id]: 5 },
    honeypot: "",
  };
  const results = await Promise.all(
    Array.from({ length: 15 }, async () => {
      const response = await fetch(`${intake}/submissions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${attempt.token}`,
          "content-type": "application/json",
          origin,
        },
        body: JSON.stringify(command),
      });
      assert.ok([200, 202].includes(response.status));
      return response.json();
    }),
  );
  assert.equal(new Set(results.map((r) => r.id)).size, 1);
  await until(async () => {
    const receipt = await fetch(`${intake}/receipt`, {
      headers: { authorization: `Bearer ${attempt.token}`, origin },
    });
    return (await receipt.json()).status === "committed";
  }, "Replay did not commit");
  const responses = await call(`/forms/${formId}/submissions`);
  assert.equal(responses.data.items.length, 1);
  assert.deepEqual(responses.data.items[0].answers, command.answers);
  const exportCsv = await fetch(`${origin}/api/forms/${formId}/export?format=csv`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(exportCsv.status, 200);
  assert.ok((await exportCsv.text()).includes("qa@example.com"));
  if (process.argv.includes("--keep")) {
    const path = ".local/http-fixture.json";
    await Bun.write(path, JSON.stringify({ ownerId, formId, token }));
    await chmod(path, 0o600);
    console.log(`HTTP end-to-end passed. Browser fixture: ${origin}/f/${formId}`);
  } else
    console.log(
      "HTTP end-to-end passed: authenticated create/publish, durable intake, 15 concurrent retries, signed replay, one stored response and CSV export.",
    );
} finally {
  if (!process.argv.includes("--keep")) {
    if (formId) {
      await db.delete(jobs).where(sql`${jobs.payload}->>'formId' = ${formId}`);
      await db.delete(submissions).where(eq(submissions.formId, formId));
      await db.delete(formVersions).where(eq(formVersions.formId, formId));
      await db.delete(forms).where(eq(forms.id, formId));
    }
    await db.delete(machineCredentials).where(eq(machineCredentials.ownerId, ownerId));
    await db.delete(workspaces).where(eq(workspaces.ownerId, ownerId));
    await db.delete(user).where(eq(user.id, ownerId));
  }
  await client.end();
}
