// update-template

import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import { formTemplateTable } from "@formsmith/database";
import { FormsmithContext } from "../..";
import cuid from "cuid";
import { getCookie } from "hono/cookie";
import { defaultFormCustomizations } from "@formsmith/shared";

export const updateTemplate = async (c: FormsmithContext) => {
  try {
    // const sessionToken = getCookie(c, "session");
    // const { session, user } = await validateSessionToken(sessionToken!, c);
    // if (!user || !session)
    //   return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const body = await c.req.json();

    const templateId = body.id;
    await db
      .update(formTemplateTable)
      .set({
        name: body.name,
        description: body.description,
        customizations: body.customizations,
        data: body.data,
      })
      .where(eq(formTemplateTable.id, templateId!))
      .run();

    return c.json({
      success: true,
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
