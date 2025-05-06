import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { and, eq } from "drizzle-orm";
import { formTable } from "@formsmith/database";

export const getForm = async (c: Context) => {
  try {
    const sessionToken = c.req.header("x-session-token");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const formId = c.req.query("form_id");

    const form = await db
      .select()
      .from(formTable)
      .where(and(eq(formTable.userId, user.id), eq(formTable.id, formId!)))
      .limit(1);

    return c.json({
      success: true,
      data: {
        form: form?.[0] ?? null,
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
