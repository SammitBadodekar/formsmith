import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { eq } from "drizzle-orm";
import { formTable } from "@formsmith/database";

export const deleteForm = async (c: Context) => {
  try {
    const sessionToken = c.req.header("x-session-token");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);

    const formId = c.req.query("form_id");
    console.log(formId);
    if (!formId) {
      return c.json(
        { success: false, error: "Missing required query parameter `form_id`" },
        400
      );
    }
    await db.delete(formTable).where(eq(formTable.id, formId)).run();

    return c.json({
      success: true,
      message: `From with id ${formId} deleted successfully`,
    });
  } catch (error) {
    console.log("error", error);
    return c.json(
      {
        success: false,
        error: error,
      },
      500
    );
  }
};
