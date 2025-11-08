"use server";

import { db } from "@/lib/db";
import { workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import cuid from "cuid";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

/**
 * Create a new workspace
 */
export async function createWorkspace(formData: FormData) {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const data = {
      name: formData.get("name") as string,
    };

    const validated = createWorkspaceSchema.parse(data);

    const workspaceId = cuid();

    await db.insert(workspace).values({
      id: workspaceId,
      name: validated.name,
      userId: user.id,
    });

    revalidatePath("/app/workspaces");
    return { success: true, id: workspaceId };
  } catch (error) {
    console.error("Create workspace error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create workspace",
    };
  }
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string) {
  try {
    const { user } = await getCurrentSession();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(workspace)
      .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Workspace not found or unauthorized");
    }

    await db.delete(workspace).where(eq(workspace.id, workspaceId));

    revalidatePath("/app/workspaces");
    return { success: true };
  } catch (error) {
    console.error("Delete workspace error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete workspace",
    };
  }
}
