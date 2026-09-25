import { displayAnswer, type FormDefinition, newId, plainText, questions } from "@formsmith/core";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuth } from "./auth";
import type { Config } from "./config";
import type { Database } from "./db";
import {
  account,
  forms,
  formVersions,
  integrations,
  jobs,
  sheetDeliveries,
  submissions,
  workspaces,
} from "./db/schema";
import type { Job } from "./job-queue";
import { outboundUrl, publicAddresses, publicFetch } from "./outbound";
import { repository, ServiceError } from "./repository";
import { decryptSecret, encryptSecret, webhookSignature } from "./secrets";

const columnSchema = z.object({ id: z.string(), label: z.string() });
const sheetsSchema = z.object({
  spreadsheetId: z.string().regex(/^[a-zA-Z0-9_-]{20,200}$/),
  sheetId: z.number().int().nonnegative(),
  title: z.string().max(100),
  columns: z.array(columnSchema),
});
const sheetScope = "https://www.googleapis.com/auth/spreadsheets";
function fields(form: FormDefinition) {
  return [
    ...questions(form).map((q) => ({ id: q.id, label: plainText(q.label) })),
    ...form.hiddenFields.map((h) => ({ id: h.id, label: h.name })),
    ...form.calculations.map((c) => ({ id: c.id, label: c.name })),
  ];
}
export function integrationService(db: Database, config: Config) {
  const repo = repository(db),
    auth = createAuth(db, config);
  async function googleToken(ownerId: string) {
    const [linked] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, ownerId), eq(account.providerId, "google")));
    if (!linked?.scope?.split(/[ ,]+/).includes(sheetScope))
      throw new ServiceError(422, "Connect Google Sheets before adding a spreadsheet");
    const token = await (await auth).api.getAccessToken({
      body: { userId: ownerId, accountId: linked.id },
    });
    if (!token.accessToken) throw new ServiceError(422, "Reconnect Google Sheets");
    return token.accessToken;
  }
  async function google(ownerId: string, path: string, method = "GET", body?: unknown) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
      method,
      headers: {
        authorization: `Bearer ${await googleToken(ownerId)}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new ServiceError(
        response.status === 401 || response.status === 403 ? 422 : 503,
        `Google Sheets request failed (${response.status}). Check access and connection.`,
      );
    return response.json() as Promise<Record<string, unknown>>;
  }
  async function destination(ownerId: string, formId: string, integrationId: string) {
    await repo.owned(ownerId, formId);
    const [row] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.formId, formId)));
    if (!row) throw new ServiceError(404, "Integration not found");
    return row;
  }
  return {
    async list(ownerId: string, formId: string) {
      await repo.owned(ownerId, formId);
      const destinations = await db
        .select({
          id: integrations.id,
          kind: integrations.kind,
          name: integrations.name,
          config: integrations.config,
          enabled: integrations.enabled,
        })
        .from(integrations)
        .where(eq(integrations.formId, formId));
      return Promise.all(
        destinations.map(async (d) => ({
          ...d,
          recentDeliveries: await db
            .select({
              id: jobs.id,
              attempts: jobs.attempts,
              completedAt: jobs.completedAt,
              failedAt: jobs.failedAt,
              lastError: jobs.lastError,
              createdAt: jobs.createdAt,
            })
            .from(jobs)
            .where(sql`${jobs.payload}->>'integrationId' = ${d.id}`)
            .orderBy(desc(jobs.createdAt))
            .limit(10),
        })),
      );
    },
    async addWebhook(ownerId: string, formId: string, input: { name: string; url: string }) {
      await repo.owned(ownerId, formId);
      let url: URL;
      try {
        url = outboundUrl(input.url);
        await publicAddresses(url.hostname);
      } catch {
        throw new ServiceError(400, "Webhook must use a public HTTPS URL on port 443");
      }
      const secret = `whsec_${newId().replaceAll("-", "")}${newId().replaceAll("-", "")}`;
      const [row] = await db
        .insert(integrations)
        .values({
          formId,
          kind: "webhook",
          name: input.name,
          config: { url: url.href },
          encryptedSecret: await encryptSecret(secret, config.ENCRYPTION_KEY),
        })
        .returning({ id: integrations.id });
      return { ...row, secret };
    },
    async addSheets(ownerId: string, formId: string, input: { spreadsheetId: string }) {
      const form = await repo.owned(ownerId, formId);
      const id = newId(),
        spreadsheetId = z
          .string()
          .regex(/^[a-zA-Z0-9_-]{20,200}$/)
          .parse(input.spreadsheetId);
      await google(ownerId, `${spreadsheetId}?fields=spreadsheetId`);
      const settings = {
        spreadsheetId,
        sheetId: (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 2000000000,
        title: `Formsmith ${id.slice(0, 8)}`,
        columns: fields(form.draft),
      };
      const [row] = await db
        .insert(integrations)
        .values({ id, formId, kind: "sheets", name: "Google Sheets", config: settings })
        .returning({ id: integrations.id });
      return row;
    },
    async setEnabled(ownerId: string, formId: string, integrationId: string, enabled: boolean) {
      await destination(ownerId, formId, integrationId);
      await db.update(integrations).set({ enabled }).where(eq(integrations.id, integrationId));
      return { enabled };
    },
    async retry(ownerId: string, formId: string, integrationId: string, jobId: string) {
      await destination(ownerId, formId, integrationId);
      const [job] = await db
        .update(jobs)
        .set({ failedAt: null, attempts: 0, availableAt: new Date(), lastError: null })
        .where(
          and(
            eq(jobs.id, jobId),
            sql`${jobs.payload}->>'integrationId' = ${integrationId}`,
            sql`${jobs.completedAt} is null`,
            sql`(${jobs.leaseUntil} is null or ${jobs.leaseUntil} < now())`,
          ),
        )
        .returning({ id: jobs.id });
      if (!job) throw new ServiceError(409, "This delivery is complete or still processing");
      return { queued: true };
    },
    async deliver(job: Job) {
      const integrationId = z.string().uuid().parse(job.payload.integrationId),
        submissionId = z.string().uuid().parse(job.payload.submissionId);
      const [target] = await db
        .select({ integration: integrations, ownerId: workspaces.ownerId })
        .from(integrations)
        .innerJoin(forms, eq(forms.id, integrations.formId))
        .innerJoin(workspaces, eq(workspaces.id, forms.workspaceId))
        .where(eq(integrations.id, integrationId));
      if (!target?.integration.enabled) return;
      const [submission] = await db
        .select()
        .from(submissions)
        .where(
          and(eq(submissions.id, submissionId), eq(submissions.formId, target.integration.formId)),
        );
      if (!submission) throw new Error("Submission missing for delivery");
      const [version] = await db
        .select()
        .from(formVersions)
        .where(eq(formVersions.id, submission.versionId));
      if (!version) throw new Error("Form version missing for delivery");
      if (target.integration.kind === "webhook") {
        const settings = z.object({ url: z.string().url() }).parse(target.integration.config);
        if (!target.integration.encryptedSecret) throw new Error("Webhook signing secret missing");
        const body = JSON.stringify({
          id: submission.id,
          type: "form.submitted",
          createdAt: submission.receivedAt.toISOString(),
          data: {
            formId: submission.formId,
            versionId: submission.versionId,
            attemptId: submission.attemptId,
            answers: submission.answers,
            fields: fields(version.definition),
          },
        });
        const timestamp = String(Math.floor(Date.now() / 1000)),
          secret = await decryptSecret(target.integration.encryptedSecret, config.ENCRYPTION_KEY);
        const response = await publicFetch(settings.url, {
          method: "POST",
          body,
          headers: {
            "content-type": "application/json",
            "webhook-id": submission.id,
            "webhook-timestamp": timestamp,
            "webhook-signature": await webhookSignature(secret, submission.id, timestamp, body),
            "user-agent": "Formsmith-Webhooks/1.0",
          },
        });
        if (response.status < 200 || response.status >= 300)
          throw new Error(`Webhook returned HTTP ${response.status}`);
        return;
      }
      const assignment = await db.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(integrations)
          .where(eq(integrations.id, integrationId))
          .for("update");
        if (!locked) throw new Error("Integration removed");
        const settings = sheetsSchema.parse(locked.config);
        for (const column of fields(version.definition))
          if (!settings.columns.some((c) => c.id === column.id)) settings.columns.push(column);
        const [existing] = await tx
          .select()
          .from(sheetDeliveries)
          .where(
            and(
              eq(sheetDeliveries.integrationId, integrationId),
              eq(sheetDeliveries.submissionId, submissionId),
            ),
          );
        if (existing) return { row: existing, settings };
        const values: (string | number | boolean)[] = [
          submission.id,
          submission.receivedAt.toISOString(),
          submission.formId,
          submission.versionId,
          ...settings.columns.map((column) =>
            displayAnswer(version.definition, column.id, submission.answers),
          ),
        ];
        const [row] = await tx
          .insert(sheetDeliveries)
          .values({ integrationId, submissionId, rowNumber: locked.nextRow, values })
          .returning();
        if (!row) throw new Error("Delivery row allocation failed");
        await tx
          .update(integrations)
          .set({ nextRow: locked.nextRow + 1, config: settings })
          .where(eq(integrations.id, integrationId));
        return { row, settings };
      });
      const { settings, row } = assignment,
        owner = target.ownerId;
      const metadata = await google(owner, `${settings.spreadsheetId}?fields=sheets.properties`);
      const sheets = z
        .array(
          z.object({
            properties: z.object({
              sheetId: z.number(),
              title: z.string(),
              gridProperties: z.object({ rowCount: z.number(), columnCount: z.number() }),
            }),
          }),
        )
        .parse(metadata.sheets);
      const sheet = sheets.find((s) => s.properties.sheetId === settings.sheetId);
      const headers = [
        "Submission ID",
        "Received at",
        "Form ID",
        "Version ID",
        ...settings.columns.map((c) => c.label),
      ];
      const capacity = Math.max(1000, Math.ceil(row.rowNumber / 1000) * 1000),
        columnCount = Math.max(26, headers.length);
      if (!sheet)
        await google(owner, `${settings.spreadsheetId}:batchUpdate`, "POST", {
          requests: [
            {
              addSheet: {
                properties: {
                  sheetId: settings.sheetId,
                  title: settings.title,
                  gridProperties: { rowCount: capacity, columnCount },
                },
              },
            },
          ],
        });
      else {
        if (sheet.properties.title !== settings.title)
          throw new Error("The connector tab was renamed. Restore its name before retrying.");
        const requests: unknown[] = [];
        if (sheet.properties.gridProperties.rowCount < row.rowNumber)
          requests.push({
            appendDimension: {
              sheetId: settings.sheetId,
              dimension: "ROWS",
              length: capacity - sheet.properties.gridProperties.rowCount,
            },
          });
        if (sheet.properties.gridProperties.columnCount < columnCount)
          requests.push({
            appendDimension: {
              sheetId: settings.sheetId,
              dimension: "COLUMNS",
              length: columnCount - sheet.properties.gridProperties.columnCount,
            },
          });
        if (requests.length)
          await google(owner, `${settings.spreadsheetId}:batchUpdate`, "POST", { requests });
      }
      const range = encodeURIComponent(`'${settings.title}'!A${row.rowNumber}`),
        headerRange = encodeURIComponent(`'${settings.title}'!A1`);
      const current = await google(
        owner,
        `${settings.spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
      );
      const occupied =
        Array.isArray(current.values) && Array.isArray(current.values[0])
          ? current.values[0][0]
          : undefined;
      if (occupied && occupied !== submissionId)
        throw new Error(
          "The connector row was moved or changed. Restore the connector tab before retrying.",
        );
      await google(
        owner,
        `${settings.spreadsheetId}/values/${headerRange}?valueInputOption=RAW`,
        "PUT",
        { values: [headers] },
      );
      // A stable allocated row makes retry after a lost response an overwrite of
      // the same event, never another append. RAW prevents spreadsheet formulas.
      await google(owner, `${settings.spreadsheetId}/values/${range}?valueInputOption=RAW`, "PUT", {
        values: [row.values],
      });
    },
  };
}
