import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

// Better Auth Tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// Application Tables
export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const form = pgTable("form", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  image: text("image"),
  logo: text("logo"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  data: jsonb("data"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  isPublished: boolean("is_published"),
  domain: text("subdomain").unique(),
  path: text("path"),
  customizations: jsonb("customizations"),
});

export const publishedForm = pgTable("published_form", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  image: text("image"),
  logo: text("logo"),
  formId: text("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" })
    .unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id),
  data: jsonb("data"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  domain: text("subdomain").unique(),
  path: text("path"),
  customizations: jsonb("customizations"),
});

export const formSubmission = pgTable("form_submission", {
  id: text("id").primaryKey(),
  formId: text("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  data: jsonb("data"),
  createdAt: timestamp("created_at"),
});

export const formTemplate = pgTable("form_template", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  data: jsonb("data"),
  customizations: jsonb("customizations"),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Type Exports
export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;
export type Workspace = InferSelectModel<typeof workspace>;
export type Form = InferSelectModel<typeof form>;
export type PublishedForm = InferSelectModel<typeof publishedForm>;
export type FormSubmission = InferSelectModel<typeof formSubmission>;
export type FormTemplate = InferSelectModel<typeof formTemplate>;
