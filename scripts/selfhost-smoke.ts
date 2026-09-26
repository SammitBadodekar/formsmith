import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { connectDatabase } from "../apps/api/src/db";
import { machineCredentials, user } from "../apps/api/src/db/schema";
import { domainService } from "../apps/api/src/domains";
import { S3Client } from "../apps/selfhost/node_modules/@aws-sdk/client-s3";
import { S3Store } from "../apps/selfhost/src/s3-store";
import { createForm, createQuestion, hashPayload, newId, text } from "../packages/core/src";

const source = new URL(process.env.DATABASE_URL ?? "");
if (source.hostname !== "127.0.0.1" || source.port !== "54329")
  throw new Error("The standalone smoke requires isolated local PostgreSQL on port 54329");
const databaseName = `formsmith_selfhost_${newId().replaceAll("-", "")}`;
const journalPrefix = `selfhost-smoke/${newId()}/`;
const adminUrl = new URL(source);
adminUrl.pathname = "/postgres";
source.pathname = `/${databaseName}`;
const admin = connectDatabase(adminUrl.href, 1);
const origin = "http://127.0.0.1:5182";
const secret = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
const env = {
  ...process.env,
  DATABASE_URL: source.href,
  PUBLIC_ORIGIN: origin,
  API_URL: "http://127.0.0.1:4001",
  INTAKE_URL: "http://127.0.0.1:8788",
  PORT: "4001",
  SELFHOST_PUBLIC_PORT: "5182",
  SELFHOST_INTAKE_PORT: "8788",
  SELFHOST_TRUST_PROXY: "false",
  JOURNAL_S3_PREFIX: journalPrefix,
  CONTROL_KEYS: JSON.stringify({ v1: secret() }),
  ADMISSION_KEYS: JSON.stringify({ v1: secret() }),
  ACTIVE_KEY_ID: "v1",
  ENCRYPTION_KEY: secret(),
  BETTER_AUTH_SECRET: secret(),
  GOOGLE_CLIENT_ID: "selfhost-smoke",
  GOOGLE_CLIENT_SECRET: "selfhost-smoke",
  CUSTOM_DOMAIN_PROVIDER: "selfhost",
  CUSTOM_DOMAIN_TARGET: "forms.selfhost.example.org",
};
for (const name of [
  "JOURNAL_S3_BUCKET",
  "JOURNAL_S3_ACCESS_KEY_ID",
  "JOURNAL_S3_SECRET_ACCESS_KEY",
])
  if (!process.env[name]) throw new Error(`Set ${name} for the standalone S3 smoke`);
const s3 = new S3Client({
  endpoint: process.env.JOURNAL_S3_ENDPOINT,
  region: process.env.JOURNAL_S3_REGION ?? "auto",
  forcePathStyle: process.env.JOURNAL_S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.JOURNAL_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.JOURNAL_S3_SECRET_ACCESS_KEY ?? "",
  },
});
const store = new S3Store(s3, process.env.JOURNAL_S3_BUCKET ?? "", journalPrefix);
const processes: ReturnType<typeof Bun.spawn>[] = [];
const outputs: Promise<string>[] = [];
const caddyDirectory = resolve(".local", `caddy-smoke-${newId()}`);
function start(path: string) {
  const child = Bun.spawn(["bun", path], { env, stdout: "pipe", stderr: "pipe" });
  processes.push(child);
  outputs.push(new Response(child.stdout).text(), new Response(child.stderr).text());
  return child;
}
async function stop(child: ReturnType<typeof Bun.spawn>, hard = false) {
  if (child.exitCode !== null) return;
  child.kill(hard ? "SIGKILL" : "SIGTERM");
  const timeout = setTimeout(() => child.kill("SIGKILL"), 15000);
  try {
    await child.exited;
  } finally {
    clearTimeout(timeout);
  }
}
async function until(check: () => Promise<boolean>, label: string) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch {
      /* Server may still be starting. */
    }
    await Bun.sleep(500);
  }
  throw new Error(label);
}
const owner = newId(),
  token = `fs_${newId()}${newId()}`;
async function call(path: string, method = "GET", body?: unknown, bearer = token) {
  const response = await fetch(origin + path, {
    method,
    headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  assert(response.ok, `${path}: ${response.status} ${result.error ?? ""}`);
  return result;
}
let database: ReturnType<typeof connectDatabase> | undefined;
let created = false;
try {
  await admin.client.unsafe(`CREATE DATABASE "${databaseName}"`);
  created = true;
  const migration = start("apps/api/src/db/migrate.ts");
  assert.equal(await migration.exited, 0, "Migration failed");
  database = connectDatabase(source.href, 2);
  await database.db.insert(user).values({
    id: owner,
    name: "Standalone test",
    email: `${owner}@example.invalid`,
    emailVerified: true,
  });
  await database.db.insert(machineCredentials).values({
    ownerId: owner,
    name: "Standalone test",
    tokenHash: await hashPayload(token),
    scopes: ["forms:read", "forms:write", "forms:publish", "submissions:read"],
    expiresAt: new Date(Date.now() + 3600000),
  });
  let api = start("apps/api/src/index.ts");
  start("apps/api/src/worker.ts");
  let standalone = start("apps/selfhost/src/index.ts");
  await until(
    async () =>
      (await fetch(`${env.API_URL}/ready`)).ok && (await fetch(`${env.INTAKE_URL}/health`)).ok,
    "Standalone services did not become ready",
  );
  const form = createForm(),
    question = {
      ...createQuestion("short_text"),
      label: text("Standalone response"),
      required: true,
    };
  form.blocks = [question];
  const saved = await call("/api/forms", "POST", { definition: form });
  const published = await call(`/api/forms/${saved.id}/publish`, "POST", {
    revision: saved.revision,
  });
  await until(
    async () =>
      (await call(`/api/forms/${saved.id}`)).syncedPolicyRevision >= published.policyRevision,
    "Standalone publication did not synchronize",
  );
  for (const [path, expected] of [
    ["/", "/assets/"],
    [`/f/${saved.id}`, "/f/assets/"],
  ]) {
    const page = await fetch(origin + path);
    assert.equal(page.status, 200);
    assert((await page.text()).includes(expected ?? ""));
  }
  assert.equal((await fetch(`${origin}/intake/internal/recover`, { method: "POST" })).status, 404);
  assert.equal((await fetch(`${origin}/assets/missing.js`)).status, 404);
  let proof = "";
  const domains = domainService(database.db, {
    canonicalHost: new URL(origin).hostname,
    cnameTarget: env.CUSTOM_DOMAIN_TARGET,
    resolve: async () => [[proof]],
  });
  const hostname = `forms-${newId()}.example.org`;
  const domain = await domains.add(owner, hostname);
  const certificate = () => fetch(`${env.INTAKE_URL}/internal/certificate?domain=${hostname}`);
  assert.equal((await certificate()).status, 403);
  assert.equal(
    (await fetch(`${origin}/intake/internal/certificate?domain=${hostname}`)).status,
    404,
  );
  proof = domain.verificationToken;
  await domains.configure(owner, domain.id, saved.id);
  await domains.verify(owner, domain.id);
  await until(
    async () =>
      (await domains.list(owner)).some((d) => d.id === domain.id && d.status === "active"),
    "Self-hosted domain did not activate",
  );
  assert.equal((await certificate()).status, 204);
  assert.equal((await fetch(origin, { headers: { host: hostname } })).status, 200);
  assert.equal(
    (
      await fetch(`${origin}/api/forms`, {
        headers: { host: hostname, authorization: `Bearer ${token}` },
      })
    ).status,
    404,
  );
  let tlsRequest: ((host?: string) => Promise<string>) | undefined;
  if (process.env.CADDY_BINARY) {
    await mkdir(caddyDirectory, { recursive: true });
    const caddyfile = `${caddyDirectory}/Caddyfile`;
    await Bun.write(
      caddyfile,
      `{
  admin off
  skip_install_trust
  auto_https disable_redirects
  storage file_system {
    root ${caddyDirectory}/data
  }
  on_demand_tls {
    ask ${env.INTAKE_URL}/internal/certificate
  }
}
https://:9443 {
  tls internal {
    on_demand
  }
  reverse_proxy 127.0.0.1:5182
}
`,
    );
    const caddy = Bun.spawn(
      [process.env.CADDY_BINARY, "run", "--config", caddyfile, "--adapter", "caddyfile"],
      { env, stdout: "pipe", stderr: "pipe" },
    );
    processes.push(caddy);
    outputs.push(new Response(caddy.stdout).text(), new Response(caddy.stderr).text());
    const ca = `${caddyDirectory}/data/pki/authorities/local/root.crt`;
    await until(() => Bun.file(ca).exists(), "Caddy did not initialize its isolated test CA");
    tlsRequest = async (host = hostname) => {
      const curl = Bun.spawn(
        [
          "curl",
          "--silent",
          "--show-error",
          "--max-time",
          "15",
          "--cacert",
          ca,
          "--resolve",
          `${host}:9443:127.0.0.1`,
          "-o",
          "/dev/null",
          "-w",
          "%{http_code}",
          `https://${host}:9443/`,
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      const output = await new Response(curl.stdout).text();
      assert.equal(await curl.exited, 0, await new Response(curl.stderr).text());
      return output;
    };
    await until(
      async () => (await tlsRequest?.()) === "200",
      "Caddy did not issue and serve the verified hostname certificate",
    );
    const requestTls = tlsRequest;
    await assert.rejects(() => requestTls(`unclaimed-${newId()}.example.org`));
  }
  await domains.remove(owner, domain.id);
  await until(
    async () => !(await domains.list(owner)).some((d) => d.id === domain.id),
    "Self-hosted domain removal did not synchronize",
  );
  assert.equal((await certificate()).status, 403);
  assert.equal((await fetch(origin, { headers: { host: hostname } })).status, 404);
  if (tlsRequest) assert.equal(await tlsRequest(), "404");
  await stop(api);
  const attempt = await call(`/intake/forms/${saved.id}/attempts`, "POST", {}, "");
  const command = {
    formId: saved.id,
    versionId: attempt.versionId,
    attemptId: attempt.attemptId,
    answers: { [question.id]: "Survives API outage and intake restart" },
  };
  const receipts = await Promise.all(
    Array.from({ length: 12 }, () => call("/intake/submissions", "POST", command, attempt.token)),
  );
  assert.equal(new Set(receipts.map((r) => r.id)).size, 1);
  assert(receipts.every((r) => r.status === "pending"));
  await stop(standalone, true);
  api = start("apps/api/src/index.ts");
  standalone = start("apps/selfhost/src/index.ts");
  await until(
    async () =>
      (await call("/intake/receipt", "GET", undefined, attempt.token)).status === "committed",
    "Standalone journal did not recover after restart",
  );
  const rows = (await call(`/api/forms/${saved.id}/submissions`)).items;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].receiptId, receipts[0].id);
  assert.deepEqual(rows[0].answers, command.answers);
  assert.equal((await call(`/api/forms/${saved.id}/export?format=json`)).length, 1);
  console.log(
    "Standalone smoke passed: built assets, publication, custom-domain ownership/routing/certificate authorization and removal, 12 concurrent retries during API outage, hard intake restart, one recovered response and export.",
  );
  if (tlsRequest)
    console.log("Caddy TLS passed with an isolated test CA; no system trust changes.");
} finally {
  await Promise.all(processes.map((child) => stop(child)));
  await database?.client.end();
  if (created) await admin.client.unsafe(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.client.end();
  try {
    while (true) {
      const page = await store.list("");
      await Promise.all(page.keys.map((key) => store.delete(key)));
      if (!page.cursor) break;
    }
  } finally {
    s3.destroy();
  }
  const logs = await Promise.all(outputs);
  await Bun.write(".local/selfhost-smoke.log", logs.join("\n"));
  await rm(caddyDirectory, { recursive: true, force: true });
}
