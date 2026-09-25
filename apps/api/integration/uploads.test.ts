import { afterAll, beforeAll, expect, test } from "bun:test";
import { createForm, createQuestion, hashPayload, newId, text } from "@formsmith/core";
import { issueAdmission, parseKeyring, verifyControl } from "@formsmith/core/intake";
import { eq, inArray } from "drizzle-orm";
import { loadConfig } from "../src/config";
import { connectDatabase } from "../src/db";
import { forms, formVersions, uploads, user, workspaces } from "../src/db/schema";
import { repository } from "../src/repository";
import { type BlobStorage, createStorage } from "../src/storage";
import { uploadService } from "../src/uploads";

const config = loadConfig();
if (
  new URL(config.DATABASE_URL).hostname !== "127.0.0.1" ||
  new URL(config.DATABASE_URL).port !== "54329"
)
  throw new Error("Use isolated integration database");
const { db, client } = connectDatabase(config.DATABASE_URL, 3);
const owners = [newId(), newId()],
  workspaceIds: string[] = [];
const objects = new Map<string, { bytes: number; contentType: string; prefix: Uint8Array }>();
const issued = new Map<string, { bytes: number; contentType: string }>();
const storage: BlobStorage = {
  async prepare(key, bytes, contentType) {
    issued.set(key, { bytes, contentType });
    return {
      url: `https://bucket.example.invalid/${key}`,
      headers: { "if-none-match": "*", "content-type": contentType },
    };
  },
  async head(key) {
    const object = objects.get(key);
    if (!object) throw new Error("No object");
    return object;
  },
  async prefix(key) {
    return objects.get(key)?.prefix ?? new Uint8Array();
  },
  async download(key) {
    return `https://bucket.example.invalid/${key}`;
  },
  async remove(key) {
    objects.delete(key);
  },
};
let formId = "",
  token = "",
  otherToken = "",
  intakeAvailable = true;
const finalized = new Set<string>();
const service = uploadService(db, config, storage, async (input, init) => {
  const request = new Request(input, init),
    body = await request.text();
  expect(await verifyControl(request, body, parseKeyring(config.CONTROL_KEYS))).toBe(true);
  if (!intakeAvailable) return new Response(null, { status: 503 });
  finalized.add(JSON.parse(body).id);
  return Response.json({ ok: true });
});
const field = { ...createQuestion("file"), label: text("Attachment"), accept: ".pdf" };
beforeAll(async () => {
  const repo = repository(db);
  for (const id of owners) {
    await db.insert(user).values({ id, name: "Upload test", email: `${id}@example.invalid` });
    workspaceIds.push((await repo.workspace(id)).id);
  }
  const definition = createForm();
  definition.blocks = [field];
  const form = await repo.create(owners[0] as string, definition);
  if (!form) throw new Error("No fixture");
  formId = form.id;
  const versionId = newId(),
    definitionHash = await hashPayload(form.draft);
  await db
    .insert(formVersions)
    .values({ id: versionId, formId, definition: form.draft, definitionHash });
  const claim = {
    purpose: "formsmith-attempt-v1" as const,
    formId,
    versionId,
    definitionHash,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };
  token = await issueAdmission(
    { ...claim, attemptId: newId() },
    parseKeyring(config.ADMISSION_KEYS),
    config.ACTIVE_KEY_ID,
  );
  otherToken = await issueAdmission(
    { ...claim, attemptId: newId() },
    parseKeyring(config.ADMISSION_KEYS),
    config.ACTIVE_KEY_ID,
  );
});
afterAll(async () => {
  await db.delete(uploads).where(eq(uploads.formId, formId));
  await db.delete(formVersions).where(eq(formVersions.formId, formId));
  await db.delete(forms).where(eq(forms.id, formId));
  await db.delete(workspaces).where(inArray(workspaces.id, workspaceIds));
  await db.delete(user).where(inArray(user.id, owners));
  await client.end();
});
test("signed uploads require create-only writes, exact size and content type", async () => {
  const s3 = createStorage({
    ...config,
    S3_ENDPOINT: "https://s3.example.invalid",
    S3_BUCKET: "test",
    S3_REGION: "auto",
    S3_ACCESS_KEY_ID: "test",
    S3_SECRET_ACCESS_KEY: "test",
    S3_FORCE_PATH_STYLE: true,
  });
  if (!s3) throw new Error("No storage");
  const signed = await s3.prepare("file", 123, "application/pdf");
  const headers = new URL(signed.url).searchParams.get("X-Amz-SignedHeaders");
  expect(headers).toContain("content-length");
  expect(headers).toContain("content-type");
  expect(headers).toContain("if-none-match");
  expect(signed.headers["if-none-match"]).toBe("*");
});
test("finalization validates bytes, isolates attempts and safely retries edge-proof failure", async () => {
  const input = { fileName: "document.pdf", contentType: "application/pdf", bytes: 123 };
  const target = await service.prepare(token, field.id, input);
  const [row] = await db.select().from(uploads).where(eq(uploads.id, target.id));
  if (!row) throw new Error("No upload");
  await expect(service.complete(otherToken, target.id)).rejects.toMatchObject({ status: 404 });
  objects.set(row.objectKey, {
    bytes: 124,
    contentType: input.contentType,
    prefix: new Uint8Array(),
  });
  await expect(service.complete(token, target.id)).rejects.toMatchObject({ status: 422 });
  objects.set(row.objectKey, { ...input, prefix: new Uint8Array() });
  intakeAvailable = false;
  await expect(service.complete(token, target.id)).rejects.toMatchObject({ status: 503 });
  expect((await db.select().from(uploads).where(eq(uploads.id, target.id)))[0]?.status).toBe(
    "ready",
  );
  intakeAvailable = true;
  expect((await service.complete(token, target.id)).id).toBe(target.id);
  expect(finalized.has(target.id)).toBe(true);
  await expect(service.download(owners[1] as string, target.id)).rejects.toMatchObject({
    status: 404,
  });
  await expect(service.media(target.id)).rejects.toMatchObject({ status: 404 });
  expect(await service.download(owners[0] as string, target.id)).toContain(row.objectKey);
  await db
    .update(uploads)
    .set({ createdAt: new Date(0) })
    .where(eq(uploads.id, target.id));
  await service.cleanup();
  expect(objects.has(row.objectKey)).toBe(true);
});
test("media validates image signatures, and cleanup removes only unfinished uploads", async () => {
  const target = await service.prepareMedia(owners[0] as string, formId, {
    fileName: "logo.png",
    contentType: "image/png",
    bytes: 20,
  });
  const [row] = await db.select().from(uploads).where(eq(uploads.id, target.id));
  if (!row) throw new Error("No upload");
  objects.set(row.objectKey, {
    bytes: 20,
    contentType: "image/png",
    prefix: new TextEncoder().encode("<script>"),
  });
  await expect(service.completeMedia(owners[0] as string, formId, target.id)).rejects.toMatchObject(
    { status: 422 },
  );
  await db
    .update(uploads)
    .set({ createdAt: new Date(0) })
    .where(eq(uploads.id, target.id));
  await service.cleanup();
  expect(objects.has(row.objectKey)).toBe(false);
  expect(await db.select().from(uploads).where(eq(uploads.id, target.id))).toHaveLength(0);
});
