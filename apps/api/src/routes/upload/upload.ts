import { Context } from "hono";
import { nanoid } from "nanoid";

export const upload = async (c: Context) => {
  const key = nanoid(10);
  const formData = await c.req.parseBody();
  const file = formData["file"];
  if (file instanceof File) {
    const fileBuffer = await file.arrayBuffer();
    const fullName = file.name;
    const ext = fullName.split(".").pop();
    const path = `images/${key}.${ext}`;
    await c.env.FORMSMITH_CDN.put(path, fileBuffer);

    return c.json({
      image: {
        url: `https://cdn.formsmith.in/${path}`,
      },
    });
  } else {
    return c.text("Invalid file", 400);
  }
};
