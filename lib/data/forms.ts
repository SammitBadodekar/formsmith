import { cache } from "react";
import "server-only";
import { db } from "@/lib/db";
import { form, publishedForm } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { notFound, unauthorized } from "next/navigation";

/**
 * Get all forms for the current user
 * Cached and deduplicated automatically
 */
export const getForms = cache(async (workspaceId?: string) => {
  const { user } = await getCurrentSession();

  if (!user) {
    unauthorized();
  }

  const conditions = [eq(form.userId, user.id)];

  if (workspaceId) {
    conditions.push(eq(form.workspaceId, workspaceId));
  }

  const forms = await db
    .select()
    .from(form)
    .where(and(...conditions))
    .orderBy(desc(form.updatedAt));

  return forms;
});

/**
 * Get a single form by ID
 * Only returns if user owns the form
 */
export const getForm = cache(async (formId: string) => {
  const { user } = await getCurrentSession();

  if (!user) {
    unauthorized();
  }

  const formData = await db
    .select()
    .from(form)
    .where(and(eq(form.id, formId), eq(form.userId, user.id)))
    .limit(1);

  if (formData.length === 0) {
    notFound();
  }

  return formData[0];
});

/**
 * Get published form by domain (public endpoint)
 * No authentication required
 */
export const getPublishedFormByDomain = cache(async (domain: string) => {
  const published = await db
    .select()
    .from(publishedForm)
    .where(eq(publishedForm.domain, domain))
    .limit(1);

  if (published.length === 0) {
    notFound();
  }

  return published[0];
});

/**
 * Check if user owns a form
 */
export const checkFormOwnership = cache(
  async (formId: string, userId: string) => {
    const formData = await db
      .select({ id: form.id })
      .from(form)
      .where(and(eq(form.id, formId), eq(form.userId, userId)))
      .limit(1);

    return formData.length > 0;
  }
);
