import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

import type { InferSelectModel } from "drizzle-orm";
import path from "path";

export const userTable = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  image: text("image"),
});

export const sessionTable = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at", {
    mode: "timestamp",
  }).notNull(),
});

export const workspaceTable = sqliteTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name"),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
});

export const formTable = sqliteTable("form", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  image: text("image"),
  logo: text("logo"),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaceTable.id),
  data: text({ mode: "json" }),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  }),
  isPublished: integer("is_published"),
  domain: text("subdomain").unique(),
  path: text("path"),
});

export const publishedFormTable = sqliteTable("published_form", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  image: text("image"),
  logo: text("logo"),
  formId: text("form_id")
    .notNull()
    .references(() => formTable.id, { onDelete: "cascade" })
    .unique(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaceTable.id),
  data: text({ mode: "json" }),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }),
  updatedAt: integer("updated_at", {
    mode: "timestamp",
  }),
  domain: text("subdomain").unique(),
  path: text("path"),
});

export const formSubmissionTable = sqliteTable("form_submission", {
  id: text("id").primaryKey(),
  formId: text("form_id")
    .notNull()
    .references(() => formTable.id, { onDelete: "cascade" }),
  data: text({ mode: "json" }),
  createdAt: integer("created_at", {
    mode: "timestamp",
  }),
});

export type User = InferSelectModel<typeof userTable>;
export type Session = InferSelectModel<typeof sessionTable>;
export type Form = InferSelectModel<typeof formTable>;
export type Workspace = InferSelectModel<typeof workspaceTable>;
export type PublishedForm = InferSelectModel<typeof publishedFormTable>;
export type FormSubmission = InferSelectModel<typeof formSubmissionTable>;
