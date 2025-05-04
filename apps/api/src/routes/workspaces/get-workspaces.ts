import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { eq } from "drizzle-orm";
import { formTable, workspaceTable } from "@formsmith/database";

export const getWorkspaces = async (c: Context) => {
  try {
    const sessionToken = c.req.header("x-session-token");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const workspaces = await db
      .select({
        workspace: workspaceTable,
        form: {
          id: formTable.id,
          name: formTable.name,
          userId: formTable.userId,
          workspaceId: formTable.workspaceId,
          createdAt: formTable.createdAt,
          updatedAt: formTable.updatedAt,
        },
      })
      .from(workspaceTable)
      .leftJoin(formTable, eq(formTable.workspaceId, workspaceTable.id))
      .where(eq(workspaceTable.userId, user.id));

    const map = new Map<
      string,
      (typeof workspaces)[0]["workspace"] & { forms: any[] }
    >();

    for (const { workspace, form } of workspaces) {
      if (!map.has(workspace.id)) {
        map.set(workspace.id, { ...workspace, forms: [] });
      }
      if (form && form.id) {
        map.get(workspace.id)!.forms.push(form);
      }
    }

    const workspacesWithForms = Array.from(map.values());

    return c.json({
      success: true,
      data: {
        workspaces: workspacesWithForms,
      },
    });
  } catch (error) {
    console.log("error", error);
    return c.json({
      success: false,
      error: error,
    });
  }
};
