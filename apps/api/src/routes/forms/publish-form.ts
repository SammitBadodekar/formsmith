import { Context } from "hono";
import {
  getDB,
  getUniqueDomainName,
  sanitizeUrlString,
  validateSessionToken,
} from "../../helpers";
import { and, eq } from "drizzle-orm";
import { formTable, publishedFormTable } from "@formsmith/database";
import { getCookie } from "hono/cookie";
import cuid from "cuid";

export const publishForm = async (c: Context) => {
  try {
    const sessionToken = getCookie(c, "session");
    const { session, user } = await validateSessionToken(sessionToken!, c);
    if (!user || !session)
      return c.json({ success: false, error: "Unauthorized" }, 403);
    const db = await getDB(c);
    const body = await c.req.json();
    const domain =
      (body.domain ? sanitizeUrlString(body.domain) : body.domain) ||
      (await getUniqueDomainName(body.name, c));
    const path = "/";

    const formId = body.id;
    await Promise.all([
      db
        .update(formTable)
        .set({ isPublished: 1, domain: domain, path: path })
        .where(and(eq(formTable.id, formId), eq(formTable.userId, user.id)))
        .run(),
      db
        .insert(publishedFormTable)
        .values({
          id: cuid(),
          formId: formId,
          data: body.data,
          name: body.name,
          description: body.description,
          image: body.image,
          logo: body.logo,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.id,
          workspaceId: body.workspaceId,
          domain: domain,
          path: path,
        })
        .onConflictDoUpdate({
          target: publishedFormTable.formId,
          set: {
            data: body.data,
            name: body.name,
            description: body.description,
            image: body.image,
            logo: body.logo,
            updatedAt: new Date(),
            path: path,
          },
        })
        .run(),
    ]);
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
