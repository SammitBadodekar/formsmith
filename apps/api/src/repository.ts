import {
  createForm,
  type FormDefinition,
  formSchema,
  hashPayload,
  newId,
  questions,
  validateAnswers,
  validateDefinition,
} from "@formsmith/core";
import { type JournalEntry, MAX_POLICY_AGE_MS } from "@formsmith/core/intake";
import { and, desc, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import type { Database } from "./db";
import {
  forms,
  formVersions,
  integrations,
  jobs,
  submissions,
  uploads,
  workspaces,
} from "./db/schema";
import { decodeCursor, formListQuery, pageQuery, pageResult } from "./pagination";

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function repository(db: Database) {
  async function workspace(ownerId: string) {
    await db.insert(workspaces).values({ ownerId }).onConflictDoNothing();
    const [value] = await db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId));
    if (!value) throw new ServiceError(503, "Workspace unavailable");
    return value;
  }
  async function owned(ownerId: string, formId: string) {
    const [row] = await db
      .select({ form: forms })
      .from(forms)
      .innerJoin(workspaces, eq(forms.workspaceId, workspaces.id))
      .where(and(eq(forms.id, formId), eq(workspaces.ownerId, ownerId), isNull(forms.archivedAt)));
    if (!row) throw new ServiceError(404, "Form not found");
    return row.form;
  }
  return {
    workspace,
    owned,
    async version(ownerId: string, formId: string, versionId: string) {
      await owned(ownerId, formId);
      const [version] = await db
        .select()
        .from(formVersions)
        .where(and(eq(formVersions.id, versionId), eq(formVersions.formId, formId)));
      if (!version) throw new ServiceError(404, "Published version not found");
      return version;
    },
    async list(ownerId: string, input: unknown = {}) {
      const ws = await workspace(ownerId);
      const { limit, cursor, search = "" } = formListQuery.parse(input);
      const scope = `forms:${ws.id}:${search}`;
      const after = decodeCursor(cursor, scope);
      const rows = await db
        .select({
          id: forms.id,
          title: sql<string>`${forms.draft}->>'title'`,
          revision: forms.revision,
          publishedVersionId: forms.publishedVersionId,
          closed: forms.closed,
          updatedAt: forms.updatedAt,
          cursorTime: sql<string>`(${forms.createdAt} AT TIME ZONE 'UTC')::text || '+00'`,
        })
        .from(forms)
        .where(
          and(
            eq(forms.workspaceId, ws.id),
            isNull(forms.archivedAt),
            search ? sql`strpos(lower(${forms.draft}->>'title'), lower(${search})) > 0` : undefined,
            after
              ? sql`(${forms.createdAt}, ${forms.id}) < (${after.timestamp}::timestamptz, ${after.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(forms.createdAt), desc(forms.id))
        .limit(limit + 1);
      return pageResult(rows, limit, scope);
    },
    async create(ownerId: string, input?: FormDefinition) {
      const ws = await workspace(ownerId);
      const draft = input ? formSchema.parse(input) : createForm();
      draft.id = newId();
      const [created] = await db
        .insert(forms)
        .values({ id: draft.id, workspaceId: ws.id, draft })
        .returning();
      return created;
    },
    async save(ownerId: string, formId: string, revision: number, input: unknown) {
      const form = await owned(ownerId, formId);
      const draft = formSchema.parse(input);
      if (draft.id !== formId) throw new ServiceError(400, "Form identity cannot change");
      const [saved] = await db
        .update(forms)
        .set({ draft, revision: sql`${forms.revision} + 1`, updatedAt: new Date() })
        .where(
          and(
            eq(forms.id, formId),
            eq(forms.workspaceId, form.workspaceId),
            eq(forms.revision, revision),
            isNull(forms.archivedAt),
          ),
        )
        .returning();
      if (!saved)
        throw new ServiceError(
          409,
          "This form changed in another tab or agent. Reload before saving.",
        );
      return saved;
    },
    async publish(ownerId: string, formId: string, revision: number) {
      const form = await owned(ownerId, formId);
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(forms)
          .where(
            and(
              eq(forms.id, formId),
              eq(forms.workspaceId, form.workspaceId),
              isNull(forms.archivedAt),
            ),
          )
          .for("update");
        if (!current || current.revision !== revision)
          throw new ServiceError(409, "Save or reload your current draft before publishing");
        const issues = validateDefinition(current.draft);
        if (issues.length)
          throw new ServiceError(422, "Repair this form before publishing", issues);
        const id = newId();
        await tx.insert(formVersions).values({
          id,
          formId,
          definition: current.draft,
          definitionHash: await hashPayload(current.draft),
        });
        const policyRevision = current.policyRevision + 1;
        await tx
          .update(forms)
          .set({ publishedVersionId: id, policyRevision, updatedAt: new Date() })
          .where(eq(forms.id, formId));
        await tx.insert(jobs).values({
          dedupeKey: `sync:${formId}:${policyRevision}`,
          kind: "sync_form",
          payload: {
            formId,
            revision: policyRevision,
            versionId: id,
            definition: current.draft,
            closed: current.closed,
            validUntil: Date.now() + MAX_POLICY_AGE_MS,
          },
        });
        return { versionId: id, policyRevision, status: "syncing" };
      });
    },
    async setClosed(ownerId: string, formId: string, closed: boolean) {
      const form = await owned(ownerId, formId);
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(forms)
          .where(
            and(
              eq(forms.id, formId),
              eq(forms.workspaceId, form.workspaceId),
              isNull(forms.archivedAt),
            ),
          )
          .for("update");
        if (!current) throw new ServiceError(404, "Form not found");
        const policyRevision = current.policyRevision + 1;
        await tx
          .update(forms)
          .set({ closed, policyRevision, updatedAt: new Date() })
          .where(eq(forms.id, formId));
        if (current.publishedVersionId) {
          const [version] = await tx
            .select()
            .from(formVersions)
            .where(eq(formVersions.id, current.publishedVersionId));
          if (!version) throw new ServiceError(503, "Published version unavailable");
          await tx.insert(jobs).values({
            dedupeKey: `sync:${formId}:${policyRevision}`,
            kind: "sync_form",
            payload: {
              formId,
              revision: policyRevision,
              versionId: version.id,
              definition: version.definition,
              closed,
              validUntil: Date.now() + MAX_POLICY_AGE_MS,
            },
          });
        }
        return { closed, policyRevision, status: "syncing" };
      });
    },
    async responses(ownerId: string, formId: string, input: unknown = {}) {
      await owned(ownerId, formId);
      const { limit, cursor } = pageQuery.parse(input);
      const scope = `submissions:${formId}`;
      const after = decodeCursor(cursor, scope);
      const rows = await db
        .select({
          ...getTableColumns(submissions),
          cursorTime: sql<string>`(${submissions.committedAt} AT TIME ZONE 'UTC')::text || '+00'`,
        })
        .from(submissions)
        .where(
          and(
            eq(submissions.formId, formId),
            after
              ? sql`(${submissions.committedAt}, ${submissions.id}) < (${after.timestamp}::timestamptz, ${after.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(submissions.committedAt), desc(submissions.id))
        .limit(limit + 1);
      return pageResult(rows, limit, scope);
    },
    async commit(entry: JournalEntry) {
      return db.transaction(async (tx) => {
        const { command } = entry;
        const [version] = await tx
          .select()
          .from(formVersions)
          .where(
            and(eq(formVersions.id, command.versionId), eq(formVersions.formId, command.formId)),
          );
        if (!version)
          throw new ServiceError(503, "Published version has not been restored or synchronized");
        if (version.definitionHash !== entry.definitionHash)
          throw new ServiceError(409, "Published definition hash mismatch");
        const checked = validateAnswers(version.definition, command.answers);
        if (!checked.valid)
          throw new ServiceError(422, "Journal validation failed", checked.errors);
        const fileIds = questions(version.definition)
          .filter((q) => q.type === "file")
          .flatMap((q) => {
            const value = checked.answers[q.id];
            return Array.isArray(value) ? value : [];
          });
        // Lock upload state until it is linked, so orphan cleanup cannot race commit.
        for (const fileId of fileIds) {
          const [upload] = await tx
            .select()
            .from(uploads)
            .where(
              and(
                eq(uploads.id, fileId),
                eq(uploads.formId, command.formId),
                eq(uploads.attemptId, command.attemptId),
              ),
            )
            .for("update");
          if (!upload || !["ready", "attached"].includes(upload.status))
            throw new ServiceError(503, "An accepted upload is not ready for attachment");
        }
        const [inserted] = await tx
          .insert(submissions)
          .values({
            receiptId: entry.receiptId,
            formId: command.formId,
            versionId: command.versionId,
            attemptId: command.attemptId,
            requestHash: entry.requestHash,
            answers: checked.answers,
            receivedAt: new Date(entry.receivedAt),
          })
          .onConflictDoNothing({ target: [submissions.formId, submissions.attemptId] })
          .returning();
        // Separate SELECT gets a fresh READ COMMITTED snapshot after a concurrent
        // conflicting insert finishes; a single CTE would not provide that guarantee.
        const existing =
          inserted ??
          (
            await tx
              .select()
              .from(submissions)
              .where(
                and(
                  eq(submissions.formId, command.formId),
                  eq(submissions.attemptId, command.attemptId),
                ),
              )
          )[0];
        if (!existing) throw new ServiceError(503, "Submission outcome unavailable");
        if (existing.requestHash !== entry.requestHash || existing.receiptId !== entry.receiptId)
          throw new ServiceError(409, "Attempt identity has already been used");
        if (inserted) {
          for (const id of fileIds)
            await tx.update(uploads).set({ status: "attached" }).where(eq(uploads.id, id));
          const destinations = await tx
            .select()
            .from(integrations)
            .where(and(eq(integrations.formId, command.formId), eq(integrations.enabled, true)));
          for (const destination of destinations)
            await tx.insert(jobs).values({
              dedupeKey: `submission:${existing.id}:${destination.id}`,
              kind: destination.kind,
              payload: {
                submissionId: existing.id,
                integrationId: destination.id,
                eventId: existing.id,
              },
            });
        }
        return {
          receiptId: existing.receiptId,
          requestHash: existing.requestHash,
          submissionId: existing.id,
        };
      });
    },
  };
}
