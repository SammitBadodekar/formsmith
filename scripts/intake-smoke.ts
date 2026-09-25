import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { controlHeaders, journalEntrySchema, verifyControl } from "../packages/core/src/intake";
import { createForm, createQuestion, newId, type Receipt, text } from "../packages/core/src/model";

// Real workerd + local R2 and Queues; the Railway boundary is a signed HTTP fixture.
// All credentials, objects and worker state are temporary and never reach the cloud.
const temporary = await mkdtemp(join(tmpdir(), "formsmith-intake-"));
const controlKeys = { v1: crypto.randomUUID() + crypto.randomUUID() };
const admissionKeys = { v1: crypto.randomUUID() + crypto.randomUUID() };
const submissions = new Map<
  string,
  { receiptId: string; requestHash: string; submissionId: string }
>();
let backendAvailable = false;
let backendCalls = 0;
const backend = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  async fetch(request) {
    const body = await request.text();
    if (!(await verifyControl(request, body, controlKeys)))
      return new Response(null, { status: 401 });
    backendCalls++;
    if (!backendAvailable) return new Response(null, { status: 503 });
    const entry = journalEntrySchema.parse(JSON.parse(body));
    const key = entry.command.attemptId;
    let result = submissions.get(key);
    if (!result) {
      result = {
        receiptId: entry.receiptId,
        requestHash: entry.requestHash,
        submissionId: newId(),
      };
      submissions.set(key, result);
    }
    return Response.json(result);
  },
});
const portProbe = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response() });
const port = portProbe.port;
await portProbe.stop(true);
const base = `http://127.0.0.1:${port}`;
const config = await Bun.file(resolve("apps/intake/wrangler.jsonc")).json();
config.main = resolve("apps/intake/src/index.ts");
config.vars.API_URL = `http://127.0.0.1:${backend.port}`;
config.vars.PUBLIC_HOSTS = "127.0.0.1,localhost";
config.vars.ALLOWED_ORIGINS = "http://127.0.0.1:5173,http://127.0.0.1:5174";
delete config.$schema;
await Bun.write(join(temporary, "wrangler.jsonc"), JSON.stringify(config));
await Bun.write(
  join(temporary, ".dev.vars"),
  `ADMISSION_KEYS='${JSON.stringify(admissionKeys)}'\nCONTROL_KEYS='${JSON.stringify(controlKeys)}'\n`,
);
const worker = Bun.spawn(
  [
    resolve("apps/intake/node_modules/.bin/wrangler"),
    "dev",
    "--config",
    join(temporary, "wrangler.jsonc"),
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--inspector-port",
    "0",
    "--local",
    "--test-scheduled",
    "--persist-to",
    join(temporary, "state"),
    "--log-level",
    "error",
  ],
  {
    stdout: Bun.file(join(temporary, "worker.log")),
    stderr: Bun.file(join(temporary, "worker-error.log")),
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  },
);
async function until(check: () => Promise<boolean>, description: string) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await Bun.sleep(200);
  }
  throw new Error(`Timed out: ${description}`);
}
try {
  await until(async () => {
    try {
      return (await fetch(`${base}/health`)).ok;
    } catch {
      return false;
    }
  }, "local Worker startup");
  const definition = createForm();
  const question = { ...createQuestion("short_text"), label: text("Your name"), required: true };
  definition.blocks = [question];
  const manifest = {
    revision: 1,
    versionId: newId(),
    definition,
    closed: false,
    validUntil: Date.now() + 86400000,
  };
  async function publish(value: typeof manifest) {
    const body = JSON.stringify(value);
    return fetch(`${base}/internal/publish`, {
      method: "POST",
      body,
      headers: await controlHeaders("POST", "/internal/publish", body, controlKeys, "v1"),
    });
  }
  assert.equal((await publish(manifest)).status, 200);
  const attemptResponse = await fetch(`${base}/forms/${definition.id}/attempts`, {
    method: "POST",
  });
  assert.equal(attemptResponse.status, 201);
  const attempt: { token: string; attemptId: string; versionId: string } =
    await attemptResponse.json();
  const headers = { authorization: `Bearer ${attempt.token}`, "content-type": "application/json" };
  const command = {
    formId: definition.id,
    versionId: attempt.versionId,
    attemptId: attempt.attemptId,
    answers: { [question.id]: "Ada" },
    honeypot: "",
  };
  const replies = await Promise.all(
    Array.from({ length: 8 }, () =>
      fetch(`${base}/submissions`, { method: "POST", headers, body: JSON.stringify(command) }),
    ),
  );
  for (const response of replies) assert.equal(response.status, 202);
  const receipts: Receipt[] = await Promise.all(replies.map((response) => response.json()));
  assert.equal(
    new Set(receipts.map((receipt) => receipt.id)).size,
    1,
    "R2 conditional creation must choose one receipt",
  );
  assert.equal(
    (
      await fetch(`${base}/submissions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...command, answers: { [question.id]: "Grace" } }),
      })
    ).status,
    409,
  );
  await until(async () => backendCalls > 0, "queue delivery to unavailable backend");
  const pending: Receipt = await (await fetch(`${base}/receipt`, { headers })).json();
  assert.equal(pending.status, "pending");
  backendAvailable = true;
  assert.equal((await fetch(`${base}/__scheduled`)).status, 200);
  await until(async () => {
    const receipt: Receipt = await (await fetch(`${base}/receipt`, { headers })).json();
    return receipt.status === "committed";
  }, "journal reconciliation after outage");
  assert.equal(submissions.size, 1);
  assert.equal((await publish({ ...manifest, revision: 2, closed: true })).status, 200);
  assert.equal(
    (await fetch(`${base}/submissions`, { method: "POST", headers, body: JSON.stringify(command) }))
      .status,
    200,
    "identical retry must work after closing",
  );
  assert.equal(
    (await fetch(`${base}/forms/${definition.id}/attempts`, { method: "POST" })).status,
    410,
  );
  assert.equal((await fetch(`${base}/receipt`)).status, 401);
  assert.equal(
    (await fetch(`${base}/internal/publish`, { method: "POST", body: JSON.stringify(manifest) }))
      .status,
    401,
  );
  console.log(
    "Intake smoke passed: real R2 conditional writes, concurrent retries, signed HTTP replay, backend outage, reconciliation, closure and receipt access.",
  );
} catch (error) {
  console.error(await Bun.file(join(temporary, "worker-error.log")).text());
  console.error(await Bun.file(join(temporary, "worker.log")).text());
  throw error;
} finally {
  worker.kill();
  await worker.exited;
  await backend.stop(true);
  await rm(temporary, { recursive: true, force: true });
}
