import { Context } from "hono";
import axios from "axios";
import { getCookie } from "hono/cookie";
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

    const [forms, workspaces] = await Promise.all([
      db.select().from(formTable).where(eq(formTable.userId, user.id)),
      db
        .select()
        .from(workspaceTable)
        .where(eq(workspaceTable.userId, user.id)),
    ]);

    return c.json({
      success: true,
      data: {
        forms: forms,
        workspaces: workspaces,
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
