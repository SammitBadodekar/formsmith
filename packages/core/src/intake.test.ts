import { expect, test } from "bun:test";
import { hashPayload } from "./commands";
import { controlHeaders, readBoundedBody, verifyControl } from "./intake";
import { answersSchema, idSchema } from "./model";

test("service signatures bind body, path, method and timestamp", async () => {
  const keys = { v1: "s".repeat(64) };
  const path = "/internal/publish";
  const body = '{"revision":1}';
  const now = Date.now();
  const headers = await controlHeaders("POST", path, body, keys, "v1", now);
  const request = new Request(`https://intake.example.test${path}`, {
    method: "POST",
    headers,
    body,
  });
  expect(await verifyControl(request, body, keys, now)).toBe(true);
  expect(await verifyControl(request, '{"revision":2}', keys, now)).toBe(false);
  expect(
    await verifyControl(
      new Request("https://intake.example.test/internal/retry", { method: "POST", headers }),
      body,
      keys,
      now,
    ),
  ).toBe(false);
  expect(await verifyControl(new Request(request.url, { headers }), body, keys, now)).toBe(false);
  expect(await verifyControl(request, body, keys, now + 300001)).toBe(false);
  expect(await verifyControl(request, body, { v1: "different" }, now)).toBe(false);
});
test("streamed bodies cannot bypass size limits by omitting Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(10));
    },
    cancel() {
      cancelled = true;
    },
  });
  await expect(readBoundedBody(stream, 15)).rejects.toThrow(RangeError);
  expect(cancelled).toBe(true);
});
test("hashes ignore object key insertion order and preserve array order", async () => {
  expect(await hashPayload({ b: 2, a: { z: 1, y: 2 } })).toBe(
    await hashPayload({ a: { y: 2, z: 1 }, b: 2 }),
  );
  expect(await hashPayload([1, 2])).not.toBe(await hashPayload([2, 1]));
});
test("external identifiers cannot target object prototypes or storage paths", () => {
  for (const value of ["__proto__", "constructor", "prototype", "../forms/id", "a/b"])
    expect(idSchema.safeParse(value).success).toBe(false);
  expect(answersSchema.safeParse(JSON.parse('{"__proto__":"bad"}')).success).toBe(false);
});
