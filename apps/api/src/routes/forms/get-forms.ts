import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { eq } from "drizzle-orm";
import { formTable, workspaceTable } from "@formsmith/database";

export const getForms = async (c: Context) => {
  try {
    const sessionToken = c.req.header("x-session-token");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);

    const forms = await db
      .select({
        id: formTable.id,
        name: formTable.name,
        description: formTable.description,
        createdAt: formTable.createdAt,
        updatedAt: formTable.updatedAt,
        userId: formTable.userId,
        workspaceId: formTable.workspaceId,
      })
      .from(formTable)
      .where(eq(formTable.userId, user.id));

    return c.json({
      success: true,
      data: {
        forms: forms,
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
