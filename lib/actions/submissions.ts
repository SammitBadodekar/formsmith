"use server";

import { db } from "@/lib/db";
import { formSubmission } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import cuid from "cuid";

/**
 * Submit a form (public endpoint - no auth required)
 * This is used by the public form pages
 */
export async function submitForm(formData: {
  formId: string;
  data: any;
}) {
  try {
    const submissionId = cuid();

    await db.insert(formSubmission).values({
      id: submissionId,
      formId: formData.formId,
      data: formData.data,
      createdAt: new Date(),
    });

    return { success: true, id: submissionId };
  } catch (error) {
    console.error("Submit form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit form",
    };
  }
}
