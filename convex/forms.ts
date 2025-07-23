import { query, mutation } from "./_generated/server";
import { Id } from "../convex/_generated/dataModel";
import { v } from "convex/values";

export const getForm = query({
  args: {
    formId: v.id("forms"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return { form: null };

    const form = await ctx.db.get(args.formId);
    if (form?.userId !== user._id) return { form: null };

    return { form };
  },
});

export const getForms = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return { forms: [] };

    const forms = await ctx.db
      .query("forms")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    return { forms };
  },
});

export const createForm = mutation({
  args: {
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return { success: false, error: "Unauthorized" };

    const formId = await ctx.db.insert("forms", {
      name: args.name ?? "",
      description: args.description ?? "",
      userId: user._id as Id<"users">,
      workspaceId: args.workspaceId,
      data: [],
      image: "",
      logo: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublished: false,
    });

    return { success: true, id: formId };
  },
});

export const deleteForm = mutation({
  args: {
    formId: v.id("forms"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return { success: false, error: "Unauthorized" };

    const form = await ctx.db.get(args.formId);
    if (form?.userId !== user._id)
      return { success: false, error: "Unauthorized" };

    const published = await ctx.db
      .query("published_forms")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .collect();

    for (const pub of published) {
      if (pub.userId === user._id) {
        await ctx.db.delete(pub._id);
      }
    }

    await ctx.db.delete(args.formId);
    return { success: true };
  },
});

export const getPublishedForm = query({
  args: {
    domain: v.string(),
    path: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const path = args.path ?? "/";

    const form = await ctx.db
      .query("published_forms")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .filter((q) => q.eq(q.field("path"), path))
      .unique();

    return { form };
  },
});

export const publishForm = mutation({
  args: {
    id: v.id("forms"),
    name: v.string(),
    description: v.string(),
    image: v.optional(v.string()),
    logo: v.optional(v.string()),
    data: v.any(),
    customizations: v.any(),
    workspaceId: v.id("workspaces"),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return { success: false, error: "Unauthorized" };

    const domain =
      (args.domain ? args.domain : `form-${Date.now()}`) || "form-1";
    const path = "/";

    await ctx.db.patch(args.id, {
      isPublished: true,
      domain,
      path,
    });

    const existing = await ctx.db
      .query("published_forms")
      .withIndex("by_form", (q) => q.eq("formId", args.id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
        path,
      });
    } else {
      await ctx.db.insert("published_forms", {
        formId: args.id,
        userId: user._id as Id<"users">,
        workspaceId: args.workspaceId,
        data: args.data,
        customizations: args.customizations,
        name: args.name,
        description: args.description,
        image: args.image,
        logo: args.logo,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        domain,
        path,
      });
    }

    return { success: true, id: args.id };
  },
});
