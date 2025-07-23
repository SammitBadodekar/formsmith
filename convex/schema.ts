import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  workspaces: defineTable({
    name: v.optional(v.string()),
    userId: v.id("users"),
  }),

  forms: defineTable({
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    logo: v.optional(v.string()),
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    data: v.optional(v.any()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
    domain: v.optional(v.string()),
    path: v.optional(v.string()),
    customizations: v.optional(v.any()),
  }).index("by_domain", ["domain"]),

  published_forms: defineTable({
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    logo: v.optional(v.string()),
    formId: v.id("forms"),
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    data: v.optional(v.any()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    domain: v.optional(v.string()),
    path: v.optional(v.string()),
    customizations: v.optional(v.any()),
  })
    .index("by_form", ["formId"])
    .index("by_domain", ["domain"]),

  form_submissions: defineTable({
    formId: v.id("forms"),
    data: v.optional(v.any()),
    createdAt: v.optional(v.number()),
  }),
});
