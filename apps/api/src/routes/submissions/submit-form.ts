import { Context } from "hono";
import { getDB } from "../../helpers";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import { formSubmissionTable } from "@formsmith/database";
import cuid from "cuid";

const schema = z.object({
  form_id: z.string(),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      input_id: z.string(),
      label_id: z.string(),
    })
  ),
});

export const submitForm = async (c: Context) => {
  try {
    const db = await getDB(c);
    const body = await c.req.json();
    let form_id = "";
    let data = {};

    try {
      const { form_id: id, data: formData } = schema.parse(body);
      form_id = id;
      data = formData;
    } catch (error) {
      return c.json(
        { success: false, error: (error as ZodError).message },
        400
      );
    }
    await db
      .insert(formSubmissionTable)
      .values({
        id: cuid(),
        formId: form_id,
        data,
        createdAt: new Date(),
      })
      .run();

    return c.json({
      success: true,
      message: `From submission successfully`,
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
