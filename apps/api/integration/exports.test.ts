import { afterAll, beforeAll, expect, test } from "bun:test";
import { createForm, hashPayload, newId } from "@formsmith/core";
import { eq } from "drizzle-orm";
import { connectDatabase } from "../src/db";
import { forms, formVersions, submissions, user, workspaces } from "../src/db/schema";
import { responseExports } from "../src/exports";
import { repository } from "../src/repository";

const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== "127.0.0.1" || new URL(url).port !== "54329")
  throw new Error("Use the isolated integration database");
const { db, client } = connectDatabase(url, 5);
const repo = repository(db),
  owner = newId(),
  formId = newId(),
  versionId = newId();
let workspaceId: string;
beforeAll(async () => {
  await db.insert(user).values({
    id: owner,
    name: "Export test",
    email: `${owner}@example.invalid`,
    emailVerified: true,
  });
  workspaceId = (await repo.workspace(owner)).id;
  const draft = { ...createForm(), id: formId };
  await db.insert(forms).values({ id: formId, workspaceId, draft });
  await db
    .insert(formVersions)
    .values({ id: versionId, formId, definition: draft, definitionHash: await hashPayload(draft) });
  await client`INSERT INTO submissions (receipt_id, form_id, version_id, attempt_id, request_hash, answers, received_at, committed_at)
    SELECT gen_random_uuid(), ${formId}::uuid, ${versionId}::uuid, gen_random_uuid(), 'fixture',
      jsonb_build_object('name', 'Person ' || i, 'formula', '=1+1'), now(),
      '2026-01-01 00:00:00+00'::timestamptz + (i / 3) * interval '1 microsecond'
    FROM generate_series(1, 10005) i`;
});
afterAll(async () => {
  await db.delete(submissions).where(eq(submissions.formId, formId));
  await db.delete(formVersions).where(eq(formVersions.formId, formId));
  await db.delete(forms).where(eq(forms.workspaceId, workspaceId));
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  await db.delete(user).where(eq(user.id, owner));
  await client.end();
});
test("keyset pagination preserves microseconds and equal timestamps without skips or duplicates", async () => {
  const expected = await client<
    { id: string }[]
  >`SELECT id FROM submissions WHERE form_id = ${formId}::uuid ORDER BY committed_at DESC, id DESC`;
  let cursor: string | null = null;
  const ids: string[] = [];
  do {
    const page = await repo.responses(owner, formId, { limit: 97, cursor: cursor ?? undefined });
    ids.push(...page.items.map((row) => row.id));
    cursor = page.nextCursor;
  } while (cursor);
  expect(ids).toEqual(expected.map((row) => row.id));
  await expect(repo.responses(owner, formId, { cursor: "garbage" })).rejects.toThrow();
  await expect(repo.responses(newId(), formId)).rejects.toMatchObject({ status: 404 });
});
test("form summaries paginate and search without loading drafts; cursor scope cannot change", async () => {
  await repo.create(owner, { ...createForm(), title: "Find 100%" });
  await repo.create(owner, { ...createForm(), title: "Find 100_" });
  const first = await repo.list(owner, { limit: 1 });
  expect(first.items).toHaveLength(1);
  expect(first.nextCursor).toBeString();
  expect(first.items[0]).not.toHaveProperty("draft");
  const second = await repo.list(owner, { limit: 1, cursor: first.nextCursor });
  expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  const search = await repo.list(owner, { search: "100%" });
  expect(search.items.map((row) => row.title)).toEqual(["Find 100%"]);
  await expect(
    repo.list(owner, { search: "different", cursor: first.nextCursor }),
  ).rejects.toThrow();
});
test("JSON and CSV export more than 10,000 rows from one snapshot despite later commits", async () => {
  const exportRows = responseExports(db);
  const json = await exportRows(owner, formId, "json", new AbortController().signal);
  const csv = await exportRows(owner, formId, "csv", new AbortController().signal);
  const [late] = await db
    .insert(submissions)
    .values({
      receiptId: newId(),
      formId,
      versionId,
      attemptId: newId(),
      requestHash: "late",
      answers: { late: "not in snapshot" },
      receivedAt: new Date(),
    })
    .returning();
  try {
    const [rows, text] = await Promise.all([json.json(), csv.text()]);
    expect(rows).toHaveLength(10005);
    expect(rows.some((row: { id: string }) => row.id === late?.id)).toBe(false);
    expect(text.trimEnd().split("\r\n")).toHaveLength(10006);
    expect(text).not.toContain("not in snapshot");
    expect(text).toContain("'=1+1");
  } finally {
    if (late) await db.delete(submissions).where(eq(submissions.id, late.id));
  }
}, 15000);
test("cancelled or abandoned downloads release the transaction and export slot", async () => {
  const exportRows = responseExports(db, { concurrency: 1, timeoutMs: 150 });
  const first = await exportRows(owner, formId, "json", new AbortController().signal);
  await expect(
    exportRows(owner, formId, "json", new AbortController().signal),
  ).rejects.toMatchObject({ status: 429 });
  await first.body?.cancel();
  await Bun.sleep(30);
  const abandoned = await exportRows(owner, formId, "json", new AbortController().signal);
  await Bun.sleep(200);
  await expect(abandoned.text()).rejects.toThrow();
  const next = await exportRows(owner, formId, "json", new AbortController().signal);
  await next.body?.cancel();
});
