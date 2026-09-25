import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createForm, newId } from "../packages/core/src";
import { controlHeaders } from "../packages/core/src/intake";

// Temporary driver exposes signed control calls only inside this isolated test.
// The production gateway is imported unchanged; assets, R2 and service bindings
// run in real workerd, with no Cloudflare account or production credentials.
const temporary = await mkdtemp(join(tmpdir(), "formsmith-gateway-"));
const keys = { v1: `${newId()}${newId()}` };
const api = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  fetch(request) {
    return Response.json({
      path: new URL(request.url).pathname,
      cookie: request.headers.get("cookie"),
      host: request.headers.get("x-forwarded-host"),
    });
  },
});
const probe = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response() });
const port = probe.port;
await probe.stop(true);
const base = `http://127.0.0.1:${port}`;
const auxiliaryProbe = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response() });
const auxiliaryPort = auxiliaryProbe.port;
await auxiliaryProbe.stop(true);
const namespace = newId().slice(0, 8);
const gatewayPath = resolve("apps/dashboard/worker.ts");
await Bun.write(
  join(temporary, "driver.ts"),
  `
import gateway from ${JSON.stringify(gatewayPath)};
export default { async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/__control/')) {
    url.pathname = '/internal/' + url.pathname.slice('/__control/'.length);
    return env.INTAKE.fetch(new Request(url, request));
  }
  url.hostname = request.headers.get('x-test-host') || env.PUBLIC_HOST;
  url.port = '';
  return gateway.fetch(new Request(url, request), env, ctx);
}};
`,
);
const configs: string[] = [];
for (const app of ["dashboard", "forms", "intake"]) {
  const directory = join(temporary, app);
  await mkdir(directory);
  const config = await Bun.file(resolve(`apps/${app}/wrangler.jsonc`)).json();
  config.name += `-${namespace}`;
  if (config.services) for (const service of config.services) service.service += `-${namespace}`;
  delete config.$schema;
  if (config.assets) config.assets.directory = resolve(`apps/${app}/dist`);
  if (app === "dashboard") config.main = join(temporary, "driver.ts");
  if (app === "intake") config.main = resolve("apps/intake/src/index.ts");
  if (config.vars) config.vars.API_URL = api.url.origin;
  const path = join(directory, "wrangler.jsonc");
  await Bun.write(path, JSON.stringify(config));
  configs.push(path);
  if (app === "intake")
    await Bun.write(
      join(directory, ".dev.vars"),
      `ADMISSION_KEYS='${JSON.stringify(keys)}'\nCONTROL_KEYS='${JSON.stringify(keys)}'\n`,
    );
}
// Installed Miniflare shares one disk service across asset directories in a
// multi-config process. Separate asset dev processes preserve their boundaries;
// Wrangler still resolves the real service binding through its local registry.
const assetsWorker = Bun.spawn(
  [
    resolve("apps/forms/node_modules/.bin/wrangler"),
    "dev",
    "--config",
    configs[1] as string,
    "--ip",
    "127.0.0.1",
    "--port",
    String(auxiliaryPort),
    "--inspector-port",
    "0",
    "--local",
    "--persist-to",
    join(temporary, "asset-state"),
    "--log-level",
    "error",
  ],
  {
    stdout: Bun.file(join(temporary, "assets.log")),
    stderr: Bun.file(join(temporary, "assets-error.log")),
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  },
);
const worker = Bun.spawn(
  [
    resolve("apps/dashboard/node_modules/.bin/wrangler"),
    "dev",
    ...configs.filter((_, i) => i !== 1).flatMap((path) => ["--config", path]),
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--inspector-port",
    "0",
    "--local",
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
const customHost = "survey.example.com";
const request = (path: string, hostname = "formsmith.samz.in", init: RequestInit = {}) =>
  fetch(`${base}${path}`, {
    redirect: "manual",
    ...init,
    headers: { ...Object.fromEntries(new Headers(init.headers)), "x-test-host": hostname },
  });
async function control(path: "publish" | "domain", value: unknown) {
  const body = JSON.stringify(value);
  return fetch(`${base}/__control/${path}`, {
    method: "POST",
    body,
    headers: await controlHeaders("POST", `/internal/${path}`, body, keys, "v1"),
  });
}
try {
  const deadline = Date.now() + 30000;
  while (true) {
    try {
      if (
        (await request("/login")).ok &&
        (await (await request(`/f/${newId()}`)).text()).includes("/f/assets/")
      )
        break;
    } catch {}
    if (Date.now() > deadline) throw new Error("Gateway did not start");
    await Bun.sleep(200);
  }
  const owned = createForm(),
    foreign = createForm();
  for (const definition of [owned, foreign])
    assert.equal(
      (
        await control("publish", {
          revision: 1,
          versionId: newId(),
          definition,
          closed: false,
          validUntil: Date.now() + 3600000,
        })
      ).status,
      200,
    );
  assert.equal((await request("/", customHost)).status, 404);
  const manifest = {
    hostname: customHost,
    revision: 1,
    active: true,
    formIds: [owned.id],
    defaultFormId: owned.id,
    validUntil: Date.now() + 3600000,
  };
  assert.equal((await control("domain", manifest)).status, 200);
  assert.match(await (await request("/login")).text(), /<title>Formsmith/);
  const formResponse = await request(`/f/${owned.id}`);
  const html = await formResponse.text();
  assert.equal(
    formResponse.status,
    200,
    JSON.stringify(Object.fromEntries(formResponse.headers)) + html.slice(0, 1000),
  );
  const asset = html.match(/src="(\/f\/assets\/[^"]+)"/)?.[1];
  assert.ok(
    asset,
    `Renderer HTML must point to its independent assets: ${JSON.stringify(Object.fromEntries(formResponse.headers))} ${html.slice(0, 1000)}`,
  );
  const js = await request(asset, customHost);
  assert.equal(js.status, 200);
  assert.match(js.headers.get("content-type") ?? "", /javascript/);
  assert.equal((await request("/", customHost)).status, 200);
  assert.equal((await request(`/f/${owned.id}`, customHost)).status, 200);
  assert.equal((await request(`/f/${foreign.id}`, customHost)).status, 404);
  for (const path of [
    "/login",
    "/api/forms",
    "/api/auth/get-session",
    "/api/mcp",
    "/.well-known/oauth-protected-resource",
    "/api/internal/intake/commit",
    "/intake/internal/publish",
  ])
    assert.equal((await request(path, customHost)).status, 404, path);
  assert.equal((await request("/api/internal/intake/commit")).status, 404);
  assert.equal((await request("/intake/internal/publish")).status, 404);
  const attempt = await request("/intake/domain/attempts", customHost, { method: "POST" });
  assert.equal(attempt.status, 201);
  assert.equal((await attempt.json()).definition.id, owned.id);
  assert.equal(
    (await request(`/intake/forms/${foreign.id}/attempts`, customHost, { method: "POST" })).status,
    404,
  );
  const proxied = await (
    await request("/api/workspace", "formsmith.samz.in", { headers: { cookie: "test=value" } })
  ).json();
  assert.equal(proxied.cookie, "test=value");
  assert.equal(proxied.host, "formsmith.samz.in");
  assert.equal(
    (
      await control("domain", {
        ...manifest,
        revision: 2,
        active: false,
        formIds: [],
        defaultFormId: null,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/", customHost)).status,
    404,
    "Removal must revoke routing immediately",
  );
  await control("domain", manifest);
  assert.equal(
    (await request("/", customHost)).status,
    404,
    "Stale publication cannot resurrect a removed domain",
  );
  console.log(
    "Gateway smoke passed: three Workers, real assets/R2/service bindings, custom-domain form isolation, auth isolation, default form, API forwarding and stale-revision-safe removal.",
  );
} catch (error) {
  console.error(await Bun.file(join(temporary, "worker-error.log")).text());
  console.error(await Bun.file(join(temporary, "worker.log")).text());
  console.error(await Bun.file(join(temporary, "assets-error.log")).text());
  throw error;
} finally {
  worker.kill();
  await worker.exited;
  assetsWorker.kill();
  await assetsWorker.exited;
  await api.stop(true);
  await rm(temporary, { recursive: true, force: true });
}
