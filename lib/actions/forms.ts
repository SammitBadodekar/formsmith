"use server";

import { db } from "@/lib/db";
import { form, publishedForm, workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import cuid from "cuid";
import { defaultFormCustomizations } from "@/lib/constants/defaults";
import { getUniqueDomainName } from "@/lib/utils/helpers";
import { z } from "zod";

// Validation schemas
const createFormSchema = z.object({
  name: z.string().min(1, "Form name is required"),
  description: z.string().nullish(),
  workspaceId: z.string().nullish(),
});

const updateFormSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  data: z.any().optional(),
  customizations: z.any().optional(),
  image: z.string().optional(),
  logo: z.string().optional(),
});

type CreateFormState = {
  success: boolean;
  id?: string;
  error?: string;
};

/**
 * Create a new form (for use with useFormState)
 */
export async function createForm(
  prevState: CreateFormState,
  formData: FormData
): Promise<CreateFormState> {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      workspaceId: formData.get("workspaceId") as string,
    };

    const validated = createFormSchema.parse(data);

    // If no workspaceId is provided, get the user's first workspace
    let workspaceId = validated.workspaceId;
    if (!workspaceId) {
      const userWorkspaces = await db
        .select()
        .from(workspace)
        .where(eq(workspace.userId, user.id))
        .limit(1);

      if (userWorkspaces.length === 0) {
        throw new Error("No workspace found. Please create a workspace first.");
      }

      workspaceId = userWorkspaces[0].id;
    }

    const formId = cuid();
    const domain = await getUniqueDomainName(validated.name);

    await db.insert(form).values({
      id: formId,
      name: validated.name,
      description: validated.description || "",
      userId: user.id,
      workspaceId: workspaceId,
      data: [],
      customizations: defaultFormCustomizations,
      image: "",
      logo: "",
      isPublished: false,
      domain,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/app/forms");
    return { success: true, id: formId };
  } catch (error) {
    console.error("Create form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create form",
    };
  }
}

/**
 * Create a new form (simple version for direct calls)
 */
export async function createFormSimple(formData: FormData) {
  return createForm({ success: false }, formData);
}

/**
 * Update an existing form
 */
export async function updateForm(formData: FormData) {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const data = {
      id: formData.get("id") as string,
      name: formData.get("name") as string | undefined,
      description: formData.get("description") as string | undefined,
      data: formData.get("data")
        ? JSON.parse(formData.get("data") as string)
        : undefined,
      customizations: formData.get("customizations")
        ? JSON.parse(formData.get("customizations") as string)
        : undefined,
      image: formData.get("image") as string | undefined,
      logo: formData.get("logo") as string | undefined,
    };

    const validated = updateFormSchema.parse(data);

    // Verify ownership
    const existing = await db
      .select()
      .from(form)
      .where(and(eq(form.id, validated.id), eq(form.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Form not found or unauthorized");
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validated.name) updateData.name = validated.name;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.data) updateData.data = validated.data;
    if (validated.customizations)
      updateData.customizations = validated.customizations;
    if (validated.image !== undefined) updateData.image = validated.image;
    if (validated.logo !== undefined) updateData.logo = validated.logo;

    await db.update(form).set(updateData).where(eq(form.id, validated.id));

    revalidatePath(`/app/forms/${validated.id}`);
    revalidatePath("/app/forms");

    return { success: true };
  } catch (error) {
    console.error("Update form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update form",
    };
  }
}

/**
 * Delete a form
 */
export async function deleteForm(formId: string) {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(form)
      .where(and(eq(form.id, formId), eq(form.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Form not found or unauthorized");
    }

    await db.delete(form).where(eq(form.id, formId));

    revalidatePath("/app/forms");
    return { success: true };
  } catch (error) {
    console.error("Delete form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete form",
    };
  }
}

/**
 * Update form (programmatic version for client components)
 */
export async function updateFormData(data: {
  formId: string;
  formData: {
    name?: string;
    description?: string;
    data?: any;
    customizations?: any;
    image?: string;
    logo?: string;
  };
}) {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(form)
      .where(and(eq(form.id, data.formId), eq(form.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Form not found or unauthorized");
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.formData.name) updateData.name = data.formData.name;
    if (data.formData.description !== undefined)
      updateData.description = data.formData.description;
    if (data.formData.data) updateData.data = data.formData.data;
    if (data.formData.customizations)
      updateData.customizations = data.formData.customizations;
    if (data.formData.image !== undefined) updateData.image = data.formData.image;
    if (data.formData.logo !== undefined) updateData.logo = data.formData.logo;

    await db.update(form).set(updateData).where(eq(form.id, data.formId));

    revalidatePath(`/app/forms/${data.formId}`);
    revalidatePath("/app/forms");

    return { success: true };
  } catch (error) {
    console.error("Update form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update form",
    };
  }
}

/**
 * Publish a form (programmatic version)
 */
export async function publishFormData(data: {
  formId: string;
  formData?: any;
}) {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get the form
    const formData = await db
      .select()
      .from(form)
      .where(and(eq(form.id, data.formId), eq(form.userId, user.id)))
      .limit(1);

    if (formData.length === 0) {
      throw new Error("Form not found or unauthorized");
    }

    const formToPublish = formData[0];

    // Check if already published
    const existing = await db
      .select()
      .from(publishedForm)
      .where(eq(publishedForm.formId, data.formId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing published form
      await db
        .update(publishedForm)
        .set({
          name: formToPublish.name,
          description: formToPublish.description,
          data: formToPublish.data,
          customizations: formToPublish.customizations,
          image: formToPublish.image,
          logo: formToPublish.logo,
          updatedAt: new Date(),
        })
        .where(eq(publishedForm.formId, data.formId));
    } else {
      // Create new published form
      await db.insert(publishedForm).values({
        id: cuid(),
        formId: data.formId,
        name: formToPublish.name,
        description: formToPublish.description,
        userId: formToPublish.userId,
        workspaceId: formToPublish.workspaceId,
        data: formToPublish.data,
        customizations: formToPublish.customizations,
        image: formToPublish.image,
        logo: formToPublish.logo,
        domain: formToPublish.domain,
        path: formToPublish.path,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Mark form as published
    await db.update(form).set({ isPublished: true }).where(eq(form.id, data.formId));

    revalidatePath(`/app/forms/${data.formId}`);
    revalidatePath("/app/forms");

    return { success: true, domain: formToPublish.domain };
  } catch (error) {
    console.error("Publish form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish form",
    };
  }
}

/**
 * Publish a form
 */
export async function publishForm(formId: string) {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get the form
    const formData = await db
      .select()
      .from(form)
      .where(and(eq(form.id, formId), eq(form.userId, user.id)))
      .limit(1);

    if (formData.length === 0) {
      throw new Error("Form not found or unauthorized");
    }

    const formToPublish = formData[0];

    // Check if already published
    const existing = await db
      .select()
      .from(publishedForm)
      .where(eq(publishedForm.formId, formId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing published form
      await db
        .update(publishedForm)
        .set({
          name: formToPublish.name,
          description: formToPublish.description,
          data: formToPublish.data,
          customizations: formToPublish.customizations,
          image: formToPublish.image,
          logo: formToPublish.logo,
          updatedAt: new Date(),
        })
        .where(eq(publishedForm.formId, formId));
    } else {
      // Create new published form
      await db.insert(publishedForm).values({
        id: cuid(),
        formId: formId,
        name: formToPublish.name,
        description: formToPublish.description,
        userId: formToPublish.userId,
        workspaceId: formToPublish.workspaceId,
        data: formToPublish.data,
        customizations: formToPublish.customizations,
        image: formToPublish.image,
        logo: formToPublish.logo,
        domain: formToPublish.domain,
        path: formToPublish.path,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Mark form as published
    await db.update(form).set({ isPublished: true }).where(eq(form.id, formId));

    revalidatePath(`/app/forms/${formId}`);
    revalidatePath("/app/forms");

    return { success: true, domain: formToPublish.domain };
  } catch (error) {
    console.error("Publish form error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish form",
    };
  }
}
