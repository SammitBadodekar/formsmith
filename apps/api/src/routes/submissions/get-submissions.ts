// get-submissions

import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { and, desc, eq } from "drizzle-orm";
import { formSubmissionTable, formTable } from "@formsmith/database";
import { getCookie } from "hono/cookie";
import { FormsmithContext } from "../..";

export const getSubmissions = async (c: FormsmithContext) => {
  try {
    const sessionToken = getCookie(c, "session");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const form_id = c.req.query("form_id");

    const form = await db
      .select({
        id: formTable.id,
        userId: formTable.userId,
      })
      .from(formTable)
      .where(eq(formTable.id, form_id!))
      .limit(1);

    if (!form[0] || form?.[0]?.userId !== user.id) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    const submissions = await db
      .select()
      .from(formSubmissionTable)
      .where(eq(formSubmissionTable.formId, form_id!))
      .orderBy(desc(formSubmissionTable.createdAt));

    return c.json({
      success: true,
      data: {
        submissions: submissions,
      },
    });
  } catch (error) {
    console.log("error", error);
    return c.json(
      {
        success: false,
        error: error,
      },
      {
        status: 500,
      }
    );
  }
};
