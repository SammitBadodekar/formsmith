import { Context } from "hono";
import { getDB } from "../../helpers";
import { and, eq } from "drizzle-orm";
import { publishedFormTable } from "@formsmith/database";

export const getPublishedForm = async (c: Context) => {
  try {
    const db = await getDB(c);
    const domain = c.req.query("domain");
    const path = c.req.query("path");

    const form = await db
      .select()
      .from(publishedFormTable)
      .where(
        and(
          eq(publishedFormTable.domain, domain!),
          eq(publishedFormTable.path, path ?? "/")
        )
      )
      .limit(1);

    return c.json({
      success: true,
      data: {
        form: form?.[0] ?? null,
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
