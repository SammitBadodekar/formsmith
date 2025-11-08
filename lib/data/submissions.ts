import { cache } from "react";
import "server-only";
import { db } from "@/lib/db";
import { formSubmission, form } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { unauthorized, notFound } from "next/navigation";
import { checkFormOwnership } from "./forms";

/**
 * Get all submissions for a form
 * Only returns if user owns the form
 */
export const getFormSubmissions = cache(async (formId: string) => {
  const { user } = await getCurrentSession();

  if (!user) {
    unauthorized();
  }

  // Verify ownership
  const isOwner = await checkFormOwnership(formId, user.id);
  if (!isOwner) {
    notFound();
  }

  const submissions = await db
    .select()
    .from(formSubmission)
    .where(eq(formSubmission.formId, formId))
    .orderBy(desc(formSubmission.createdAt));

  return submissions;
});

/**
 * Get a single submission by ID
 */
export const getSubmission = cache(async (submissionId: string) => {
  const { user } = await getCurrentSession();

  if (!user) {
    unauthorized();
  }

  const submission = await db
    .select({
      submission: formSubmission,
      form: form,
    })
    .from(formSubmission)
    .innerJoin(form, eq(formSubmission.formId, form.id))
    .where(
      and(eq(formSubmission.id, submissionId), eq(form.userId, user.id))
    )
    .limit(1);

  if (submission.length === 0) {
    notFound();
  }

  return submission[0];
});
