import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { and, eq } from "drizzle-orm";
import { formTable } from "@formsmith/database";
import { getCookie } from "hono/cookie";
import { FormsmithContext } from "../..";

export const updateForm = async (c: FormsmithContext) => {
  try {
    const sessionToken = getCookie(c, "session");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const body = await c.req.json();
    const { id, updatedAt, createdAt, ...rest } = body;

    const formId = body.id;
    await db
      .update(formTable)
      .set({
        ...rest,
        updatedAt: new Date(),
      })
      .where(and(eq(formTable.id, formId), eq(formTable.userId, user.id)))
      .run();

    return c.json({
      success: true,
      id: formId,
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
