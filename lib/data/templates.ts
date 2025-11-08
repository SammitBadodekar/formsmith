import { cache } from "react";
import "server-only";
import { db } from "@/lib/db";
import { formTemplate } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

/**
 * Get all templates (public)
 */
export const getTemplates = cache(async () => {
  const templates = await db.select().from(formTemplate);
  return templates;
});

/**
 * Get a single template by ID (public)
 */
export const getTemplate = cache(async (templateId: string) => {
  const template = await db
    .select()
    .from(formTemplate)
    .where(eq(formTemplate.id, templateId))
    .limit(1);

  if (template.length === 0) {
    notFound();
  }

  return template[0];
});
