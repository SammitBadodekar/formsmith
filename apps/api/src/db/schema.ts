import type { Answers, FormDefinition } from "@formsmith/core";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

const date = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .unique()
    .references(() => user.id),
  name: text("name").notNull().default("My workspace"),
  createdAt: date("created_at").notNull().defaultNow(),
});
export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    draft: jsonb("draft").$type<FormDefinition>().notNull(),
    revision: integer("revision").notNull().default(1),
    publishedVersionId: uuid("published_version_id"),
    policyRevision: integer("policy_revision").notNull().default(0),
    syncedPolicyRevision: integer("synced_policy_revision").notNull().default(0),
    closed: boolean("closed").notNull().default(false),
    archivedAt: date("archived_at"),
    createdAt: date("created_at").notNull().defaultNow(),
    updatedAt: date("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("forms_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
  ],
);
export const formVersions = pgTable(
  "form_versions",
  {
    id: uuid("id").primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    definition: jsonb("definition").$type<FormDefinition>().notNull(),
    definitionHash: text("definition_hash").notNull(),
    createdAt: date("created_at").notNull().defaultNow(),
  },
  (table) => [index("form_versions_form_idx").on(table.formId)],
);
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id").notNull().unique(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    versionId: uuid("version_id")
      .notNull()
      .references(() => formVersions.id),
    attemptId: uuid("attempt_id").notNull(),
    requestHash: text("request_hash").notNull(),
    answers: jsonb("answers").$type<Answers>().notNull(),
    receivedAt: date("received_at").notNull(),
    committedAt: date("committed_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("submissions_form_attempt_unique").on(table.formId, table.attemptId),
    index("submissions_form_committed_idx").on(table.formId, table.committedAt, table.id),
  ],
);
export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    kind: text("kind", { enum: ["webhook", "sheets"] }).notNull(),
    name: text("name").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    encryptedSecret: text("encrypted_secret"),
    enabled: boolean("enabled").notNull().default(true),
    nextRow: integer("next_row").notNull().default(2),
    createdAt: date("created_at").notNull().defaultNow(),
  },
  (table) => [index("integrations_form_idx").on(table.formId)],
);
export const sheetDeliveries = pgTable(
  "sheet_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id),
    rowNumber: integer("row_number").notNull(),
    values: jsonb("values").$type<(string | number | boolean)[]>().notNull(),
  },
  (table) => [
    uniqueIndex("sheet_delivery_submission_unique").on(table.integrationId, table.submissionId),
    uniqueIndex("sheet_delivery_row_unique").on(table.integrationId, table.rowNumber),
  ],
);
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    kind: text("kind", { enum: ["sync_form", "sync_domain", "webhook", "sheets"] }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    availableAt: date("available_at").notNull().defaultNow(),
    leaseUntil: date("lease_until"),
    leaseToken: uuid("lease_token"),
    completedAt: date("completed_at"),
    failedAt: date("failed_at"),
    lastError: text("last_error"),
    createdAt: date("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("jobs_available_idx")
      .on(table.availableAt)
      .where(sql`${table.completedAt} is null and ${table.failedAt} is null`),
  ],
);
export const machineCredentials = pgTable("machine_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  expiresAt: date("expires_at").notNull(),
  revokedAt: date("revoked_at"),
  createdAt: date("created_at").notNull().defaultNow(),
});
export const agentRevocations = pgTable(
  "agent_revocations",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    revokedAt: date("revoked_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.clientId] })],
);
export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .notNull()
    .references(() => forms.id),
  attemptId: uuid("attempt_id"),
  questionId: text("question_id"),
  ownerId: text("owner_id").references(() => user.id),
  objectKey: text("object_key").notNull().unique(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  bytes: integer("bytes").notNull(),
  status: text("status", { enum: ["pending", "ready", "attached", "deleting"] })
    .notNull()
    .default("pending"),
  createdAt: date("created_at").notNull().defaultNow(),
});

export const customDomains = pgTable(
  "custom_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    hostname: text("hostname").notNull(),
    verificationToken: text("verification_token").notNull(),
    verifiedAt: date("verified_at"),
    defaultFormId: uuid("default_form_id").references(() => forms.id),
    providerId: text("provider_id"),
    status: text("status", {
      enum: ["pending", "provisioning", "active", "error", "removing", "removed"],
    })
      .notNull()
      .default("pending"),
    sslStatus: text("ssl_status"),
    verificationRecords: jsonb("verification_records")
      .$type<{ type: string; name: string; value: string }[]>()
      .notNull()
      .default([]),
    revision: integer("revision").notNull().default(1),
    syncedRevision: integer("synced_revision").notNull().default(0),
    routeRevision: bigint("route_revision", { mode: "number" })
      .notNull()
      .default(sql`nextval('domain_route_revision')`),
    lastError: text("last_error"),
    checkedAt: date("checked_at"),
    createdAt: date("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("custom_domains_workspace_hostname_unique").on(table.workspaceId, table.hostname),
    uniqueIndex("custom_domains_verified_hostname_unique")
      .on(table.hostname)
      .where(sql`${table.verifiedAt} is not null`),
  ],
);
