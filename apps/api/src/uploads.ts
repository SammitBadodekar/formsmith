import { newId, questions } from "@formsmith/core";
import { controlHeaders, parseKeyring, verifyAdmission } from "@formsmith/core/intake";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import type { Config } from "./config";
import type { Database } from "./db";
import { formVersions, uploads } from "./db/schema";
import { repository, ServiceError } from "./repository";
import { type BlobStorage, createStorage, isImage } from "./storage";

export const uploadInput = z.object({
  fileName: z
    .string()
    .min(1)
    .max(200)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Reject controls and path separators in uploaded file names.
    .refine((value) => !/[\u0000-\u001f\u007f/\\]/.test(value), "Invalid file name"),
  contentType: z
    .string()
    .regex(/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/)
    .max(200),
  bytes: z
    .number()
    .int()
    .min(1)
    .max(25 * 1024 * 1024),
});
type Input = z.infer<typeof uploadInput>;
export function uploadService(
  db: Database,
  config: Config,
  storage: BlobStorage | null = createStorage(config),
  send: (input: URL, init: RequestInit) => Promise<Response> = fetch,
) {
  const repo = repository(db);
  const requireStorage = () => {
    if (!storage) throw new ServiceError(503, "File storage is not configured");
    return storage;
  };
  async function admission(token: string) {
    const claim = await verifyAdmission(token, parseKeyring(config.ADMISSION_KEYS));
    if (!claim) throw new ServiceError(401, "Invalid form session");
    if (claim.expiresAt <= Date.now()) throw new ServiceError(410, "This form session has expired");
    const [version] = await db
      .select()
      .from(formVersions)
      .where(and(eq(formVersions.id, claim.versionId), eq(formVersions.formId, claim.formId)));
    if (!version || version.definitionHash !== claim.definitionHash)
      throw new ServiceError(404, "Published form version not found");
    return { claim, definition: version.definition };
  }
  async function allocate(
    input: Input,
    formId: string,
    context: { attemptId: string; questionId: string } | { ownerId: string },
  ) {
    requireStorage();
    const id = newId(),
      objectKey = `uploads/${formId}/${id}`;
    // A per-attempt quota transaction is short and performs no object-store I/O.
    await db.transaction(async (tx) => {
      const quota = "attemptId" in context ? context.attemptId : `${context.ownerId}:${formId}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${quota}, 0))`);
      const [quotaRow] = await tx
        .select({ count: sql<number>`count(*)::integer` })
        .from(uploads)
        .where(
          and(
            eq(uploads.formId, formId),
            "attemptId" in context
              ? eq(uploads.attemptId, context.attemptId)
              : eq(uploads.ownerId, context.ownerId),
          ),
        );
      if (!quotaRow || quotaRow.count >= ("attemptId" in context ? 30 : 500))
        throw new ServiceError(429, "Upload limit reached for this form session");
      await tx.insert(uploads).values({ id, formId, ...context, objectKey, ...input });
    });
    const signed = await requireStorage().prepare(objectKey, input.bytes, input.contentType);
    return { id, ...signed };
  }
  async function finalize(row: typeof uploads.$inferSelect) {
    const store = requireStorage();
    if (row.status === "deleting") throw new ServiceError(410, "This upload expired");
    if (row.status === "pending") {
      const meta = await store.head(row.objectKey);
      if (meta.bytes !== row.bytes || meta.contentType !== row.contentType)
        throw new ServiceError(422, "Uploaded file does not match its declared size and type");
      if (row.ownerId && !isImage(await store.prefix(row.objectKey), row.contentType))
        throw new ServiceError(422, "Upload a PNG, JPEG, GIF or WebP image");
      const [ready] = await db
        .update(uploads)
        .set({ status: "ready" })
        .where(and(eq(uploads.id, row.id), eq(uploads.status, "pending")))
        .returning();
      if (!ready) {
        const [current] = await db.select().from(uploads).where(eq(uploads.id, row.id));
        if (!current || !["ready", "attached"].includes(current.status))
          throw new ServiceError(409, "Upload changed; please retry");
      }
    }
    if (row.attemptId && row.questionId) {
      const body = JSON.stringify({
        id: row.id,
        formId: row.formId,
        attemptId: row.attemptId,
        questionId: row.questionId,
        bytes: row.bytes,
      });
      const path = "/internal/upload";
      const response = await send(new URL(path, config.INTAKE_URL), {
        method: "POST",
        body,
        headers: await controlHeaders(
          "POST",
          path,
          body,
          parseKeyring(config.CONTROL_KEYS),
          config.ACTIVE_KEY_ID,
        ),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      await response.body?.cancel();
      if (!response.ok)
        throw new ServiceError(503, "File is stored; retry to finish upload verification");
    }
    return {
      id: row.id,
      ...(row.ownerId ? { url: `${config.PUBLIC_ORIGIN}/api/media/${row.id}` } : {}),
    };
  }
  return {
    async prepare(token: string, questionId: string, input: Input) {
      const { claim, definition } = await admission(token);
      const question = questions(definition).find((q) => q.id === questionId && q.type === "file");
      if (!question) throw new ServiceError(422, "This question does not accept files");
      const accept =
        question.accept
          ?.split(",")
          .map((type) => type.trim().toLowerCase())
          .filter(Boolean) ?? [];
      if (
        accept.length &&
        !accept.some((type) =>
          type.startsWith(".")
            ? input.fileName.toLowerCase().endsWith(type)
            : type.endsWith("/*")
              ? input.contentType.startsWith(type.slice(0, -1))
              : type === input.contentType,
        )
      )
        throw new ServiceError(422, "This file type is not accepted");
      return allocate(input, claim.formId, { attemptId: claim.attemptId, questionId });
    },
    async complete(token: string, id: string) {
      const { claim } = await admission(token);
      const [row] = await db
        .select()
        .from(uploads)
        .where(
          and(
            eq(uploads.id, id),
            eq(uploads.formId, claim.formId),
            eq(uploads.attemptId, claim.attemptId),
            isNull(uploads.ownerId),
          ),
        );
      if (!row) throw new ServiceError(404, "Upload not found");
      return finalize(row);
    },
    async prepareMedia(ownerId: string, formId: string, input: Input) {
      await repo.owned(ownerId, formId);
      if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(input.contentType))
        throw new ServiceError(422, "Use a PNG, JPEG, GIF or WebP image");
      return allocate(input, formId, { ownerId });
    },
    async completeMedia(ownerId: string, formId: string, id: string) {
      await repo.owned(ownerId, formId);
      const [row] = await db
        .select()
        .from(uploads)
        .where(and(eq(uploads.id, id), eq(uploads.formId, formId), eq(uploads.ownerId, ownerId)));
      if (!row) throw new ServiceError(404, "Media not found");
      return finalize(row);
    },
    async media(id: string) {
      const [row] = await db
        .select()
        .from(uploads)
        .where(and(eq(uploads.id, id), inArray(uploads.status, ["ready", "attached"])));
      if (
        !row?.ownerId ||
        !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(row.contentType)
      )
        throw new ServiceError(404, "Media not found");
      return requireStorage().download(row.objectKey, row.contentType);
    },
    async download(ownerId: string, id: string) {
      const [row] = await db
        .select()
        .from(uploads)
        .where(and(eq(uploads.id, id), inArray(uploads.status, ["ready", "attached"])));
      if (!row) throw new ServiceError(404, "File not found");
      await repo.owned(ownerId, row.formId);
      return requireStorage().download(row.objectKey, "application/octet-stream", row.fileName);
    },
    async cleanup() {
      if (!storage) return;
      // Ready files may belong to an accepted journal awaiting replay during a
      // backend outage. Never time-delete them without intake reconciliation.
      const abandoned = await db.transaction(async (tx) => {
        const rows = await tx
          .select({ id: uploads.id })
          .from(uploads)
          .where(
            and(
              eq(uploads.status, "pending"),
              lt(uploads.createdAt, new Date(Date.now() - 48 * 3600000)),
            ),
          )
          .limit(10)
          .for("update", { skipLocked: true });
        if (rows.length)
          await tx
            .update(uploads)
            .set({ status: "deleting" })
            .where(
              inArray(
                uploads.id,
                rows.map((row) => row.id),
              ),
            );
        return rows;
      });
      const deleting = await db
        .select()
        .from(uploads)
        .where(eq(uploads.status, "deleting"))
        .limit(10);
      for (const row of deleting) {
        await storage.remove(row.objectKey);
        await db.delete(uploads).where(and(eq(uploads.id, row.id), eq(uploads.status, "deleting")));
      }
      return abandoned.length;
    },
  };
}
