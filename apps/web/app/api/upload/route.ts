import { r2 } from "better-upload/server/helpers";
import { createUploadRouteHandler, route } from "better-upload/server";

const client = r2({
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
});

export const { POST } = createUploadRouteHandler({
  client: client,
  bucketName: "formsmith-cdn",
  routes: {
    formsmithCdn: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      maxFileSize: 1024 * 1024 * 10, // 10 MB
    }),
  },
});
