import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { eq } from "drizzle-orm";
import { formTemplateTable } from "@formsmith/database";
import { getCookie } from "hono/cookie";
import { FormsmithContext } from "../..";

export const getTemplate = async (c: FormsmithContext) => {
  try {
    // const sessionToken = getCookie(c, "session");
    // const { session, user } = await validateSessionToken(sessionToken!, c);
    // if (!user || !session)
    //   return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const templateId = c.req.query("id");
    const template = await db
      .select()
      .from(formTemplateTable)
      .where(eq(formTemplateTable.id, templateId!))
      .limit(1);

    return c.json({
      success: true,
      data: {
        template: template?.[0] ?? null,
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
