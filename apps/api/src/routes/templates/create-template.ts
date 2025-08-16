import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import { formTemplateTable } from "@formsmith/database";
import { FormsmithContext } from "../..";
import cuid from "cuid";
import { getCookie } from "hono/cookie";
import { defaultFormCustomizations } from "@formsmith/shared";

export const createTemplate = async (c: FormsmithContext) => {
  try {
    // const sessionToken = getCookie(c, "session");
    // const { session, user } = await validateSessionToken(sessionToken!, c);
    // if (!user || !session)
    //   return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);

    const body = await c.req.json();
    const templateId = cuid();

    await db
      .insert(formTemplateTable)
      .values({
        id: templateId,
        name: body.name || "",
        description: body.description || "",
        creatorId: body.creatorId,
        data: body.data ?? [],
        customizations: body.customizations ?? {
          ...defaultFormCustomizations,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    return c.json({
      success: true,
      id: templateId,
    });
  } catch (error) {}
};
