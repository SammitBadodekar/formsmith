import { afterAll, afterEach, expect, spyOn, test } from "bun:test";
import { createForm } from "@formsmith/core";
import type { FormRecord } from "../src/api";
import {
  cacheSavedForm,
  createQueryClient,
  formListQuery,
  formQuery,
  resourceQuery,
} from "../src/queries";

const clients: ReturnType<typeof createQueryClient>[] = [];
const client = () => {
  const value = createQueryClient();
  clients.push(value);
  return value;
};
const fetchSpy = spyOn(globalThis, "fetch");
afterAll(() => {
  fetchSpy.mockRestore();
});
function respond(fn: (input: unknown, init?: RequestInit) => Promise<Response>) {
  fetchSpy.mockImplementation(Object.assign(fn, { preconnect: () => {} }));
}
afterEach(() => {
  clients.splice(0).forEach((value) => {
    value.clear();
  });
  fetchSpy.mockReset();
});

test("concurrent reads are deduplicated and fresh navigation reuses data", async () => {
  respond(async () => Response.json([{ id: "one" }]));
  const cache = client(),
    options = resourceQuery<{ id: string }[]>("/domains");
  const [a, b] = await Promise.all([cache.fetchQuery(options), cache.fetchQuery(options)]);
  expect(a).toEqual(b);
  await cache.fetchQuery(options);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

test("cancelled reads abort fetch instead of writing late data", async () => {
  let aborted = false;
  respond(
    (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
  );
  const cache = client(),
    options = resourceQuery("/domains");
  const pending = cache.fetchQuery(options).catch(() => undefined);
  await cache.cancelQueries({ queryKey: options.queryKey });
  await pending;
  expect(aborted).toBe(true);
  expect(cache.getQueryData(options.queryKey)).toBeUndefined();
});

test("private data is isolated between account clients", async () => {
  respond(async () => Response.json([{ id: "private" }]));
  const owner = client(),
    other = client(),
    options = resourceQuery("/credentials");
  await owner.fetchQuery(options);
  expect(other.getQueryData(options.queryKey)).toBeUndefined();
  owner.clear();
  expect(owner.getQueryData(options.queryKey)).toBeUndefined();
});

test("a save updates its detail and invalidates every search result", async () => {
  const cache = client();
  for (const search of ["", "original title"])
    cache.setQueryData(formListQuery(search).queryKey, {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [null],
    });
  const record: FormRecord = {
    id: "form",
    draft: createForm(),
    revision: 2,
    policyRevision: 0,
    syncedPolicyRevision: 0,
    publishedVersionId: null,
    closed: false,
    updatedAt: new Date().toISOString(),
  };
  cacheSavedForm(cache, record);
  expect(cache.getQueryData<FormRecord>(formQuery(record.id).queryKey)).toEqual(record);
  for (const search of ["", "original title"])
    expect(cache.getQueryState(formListQuery(search).queryKey)?.isInvalidated).toBe(true);
});

test("authorization failures do not retry", async () => {
  respond(async () => Response.json({ error: "Not signed in" }, { status: 401 }));
  await expect(client().fetchQuery(resourceQuery("/forms"))).rejects.toThrow("Not signed in");
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
