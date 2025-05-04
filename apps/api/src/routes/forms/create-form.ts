import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { eq } from "drizzle-orm";
import { formTable } from "@formsmith/database";
import { v4 as uuid } from "uuid";

export const createForm = async (c: Context) => {
  try {
    const sessionToken = c.req.header("x-session-token");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const body = await c.req.json();
    console.log(body);

    const formId = uuid();
    await db
      .insert(formTable)
      .values({
        id: formId,
        name: body.name || "",
        description: body.description || "",
        userId: user.id,
        workspaceId: body.workspaceId,
        data: [],
        image: "",
        logo: "",
        createdAt: new Date(),
        updatedAt: new Date(),
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
