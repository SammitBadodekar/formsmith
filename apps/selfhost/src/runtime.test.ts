import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { staticAssets } from "./assets";
import { requestLimit } from "./limits";
import { replayQueue } from "./replay";
import { S3Store } from "./s3-store";

test("standalone startup rejects an S3 endpoint that silently ignores conditional writes", async () => {
  const endpoint = Bun.serve({
    port: 0,
    fetch: (request) => new Response(null, { status: request.method === "DELETE" ? 204 : 200 }),
  });
  const client = new S3Client({
    endpoint: endpoint.url.href,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    maxAttempts: 1,
  });
  try {
    await expect(new S3Store(client, "test").verify()).rejects.toThrow("conditional creation");
  } finally {
    client.destroy();
    await endpoint.stop(true);
  }
});

test("standalone assets cannot escape their root and missing scripts never receive SPA HTML", async () => {
  const directory = await mkdtemp(join(tmpdir(), "formsmith-assets-"));
  try {
    await mkdir(join(directory, "public"));
    await writeFile(join(directory, "secret"), "private");
    await writeFile(join(directory, "public", "index.html"), "<main>Formsmith</main>");
    const assets = staticAssets(join(directory, "public"));
    const call = (path: string, method = "GET") =>
      assets.fetch(new Request(`http://localhost${path}`, { method }));
    expect(await (await call("/forms/123")).text()).toContain("Formsmith");
    expect((await call("/assets/missing.js")).status).toBe(404);
    expect((await call("/%2e%2e%2fsecret")).status).toBe(404);
    expect((await call("/", "POST")).status).toBe(405);
    expect(await (await call("/", "HEAD")).text()).toBe("");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("standalone request limits isolate clients and recover when the window expires", () => {
  let now = 1000;
  const limit = requestLimit(2, () => now);
  expect(limit("first")).toBe(true);
  expect(limit("first")).toBe(true);
  expect(limit("first")).toBe(false);
  expect(limit("second")).toBe(true);
  now += 60000;
  expect(limit("first")).toBe(true);
});

test("standalone replay bounds concurrency, coalesces active keys and stops without starting queued work", async () => {
  const started: string[] = [];
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queue = replayQueue(
    async (key) => {
      started.push(key);
      await gate;
    },
    () => {},
    1,
  );
  await queue.enqueue("one");
  await queue.enqueue("one");
  await queue.enqueue("two");
  const stopped = queue.stop();
  release?.();
  await stopped;
  expect(started).toEqual(["one"]);
  await expect(queue.enqueue("three")).rejects.toThrow("stopping");
});
