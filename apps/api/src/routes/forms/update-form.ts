import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { eq } from "drizzle-orm";
import { formTable } from "@formsmith/database";
import { v4 as uuid } from "uuid";
import { getCookie } from "hono/cookie";

export const updateForm = async (c: Context) => {
  try {
    const sessionToken = getCookie(c, "session");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const body = await c.req.json();

    console.log("here in body", body);
    const formId = body.id;
    await db
      .update(formTable)
      .set({
        data: body.data,
        name: body.name,
        description: body.description,
        image: body.image,
        logo: body.logo,
        updatedAt: new Date(),
      })
      .where(eq(formTable.id, formId))
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
