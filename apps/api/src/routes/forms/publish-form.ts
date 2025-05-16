import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { eq } from "drizzle-orm";
import { formTable, publishedFormTable } from "@formsmith/database";
import { getCookie } from "hono/cookie";

export const publishForm = async (c: Context) => {
  try {
    const sessionToken = getCookie(c, "session");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const body = await c.req.json();

    const formId = body.id;
    await db
      .insert(publishedFormTable)
      .values({
        id: formId,
        data: body.data,
        name: body.name,
        description: body.description,
        image: body.image,
        logo: body.logo,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id,
        workspaceId: body.workspaceId,
      })
      .onConflictDoUpdate({
        target: publishedFormTable.id,
        set: {
          data: body.data,
          name: body.name,
          description: body.description,
          image: body.image,
          logo: body.logo,
          updatedAt: new Date(),
        },
      })
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
