import { cache } from "react";
import "server-only";
import { db } from "@/lib/db";
import { workspace, form } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { unauthorized, notFound } from "next/navigation";

/**
 * Get all workspaces for the current user
 */
export const getWorkspaces = cache(async () => {
  const { user } = await getCurrentSession();

  if (!user) {
    unauthorized();
  }

  const workspaces = await db
    .select()
    .from(workspace)
    .where(eq(workspace.userId, user.id));

  return workspaces;
});

/**
 * Get a single workspace by ID
 */
export const getWorkspace = cache(async (workspaceId: string) => {
  const { user } = await getCurrentSession();

  if (!user) {
    unauthorized();
  }

  const workspaceData = await db
    .select()
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, user.id)))
    .limit(1);

  if (workspaceData.length === 0) {
    notFound();
  }

  return workspaceData[0];
});

/**
 * Check if user owns a workspace
 */
export const checkWorkspaceOwnership = cache(
  async (workspaceId: string, userId: string) => {
    const workspaceData = await db
      .select({ id: workspace.id })
      .from(workspace)
      .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)))
      .limit(1);

    return workspaceData.length > 0;
  }
);

/**
 * Get all workspaces with their forms for the current user
 */
export const getWorkspacesWithForms = cache(async () => {
  const { user } = await getCurrentSession();

  if (!user) {
    unauthorized();
  }

  // Get all workspaces for the user
  const workspaces = await db
    .select()
    .from(workspace)
    .where(eq(workspace.userId, user.id));

  // Get all forms for the user
  const forms = await db
    .select()
    .from(form)
    .where(eq(form.userId, user.id))
    .orderBy(desc(form.updatedAt));

  // Group forms by workspace
  const workspacesWithForms = workspaces.map((ws) => ({
    ...ws,
    forms: forms.filter((f) => f.workspaceId === ws.id),
  }));

  return workspacesWithForms;
});
