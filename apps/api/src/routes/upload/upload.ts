import { Context } from "hono";
import { nanoid } from "nanoid";
import { Env, FormsmithContext } from "../..";

export const upload = async (c: FormsmithContext) => {
  const key = nanoid(10);
  const formData = await c.req.parseBody();
  const file = formData["file"];
  if (file instanceof File) {
    const fileBuffer = await file.arrayBuffer();
    const fullName = file.name;
    const ext = fullName.split(".").pop();
    const path = `images/${key}.${ext}`;
    const { FORMSMITH_CDN, CDN_URL } = c.env;
    await FORMSMITH_CDN.put(path, fileBuffer);

    return c.json({
      image: {
        url: `${CDN_URL}/${path}`,
      },
    });
  } else {
    return c.text("Invalid file", 400);
  }
};
