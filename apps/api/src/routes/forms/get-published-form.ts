import { Context } from "hono";
import { getDB, validateSessionToken } from "../../helpers";
import { and, eq } from "drizzle-orm";
import { formTable } from "@formsmith/database";

export const getPublishedForm = async (c: Context) => {
  try {
    const db = await getDB(c);
    const domain = c.req.query("domain");
    const path = c.req.query("path");

    const form = await db
      .select()
      .from(formTable)
      .where(
        and(eq(formTable.domain, domain!), eq(formTable.path, path ?? "/"))
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
    return c.json({
      success: false,
      error: error,
    });
  }
};
