import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@formsmith/database";

export const db = drizzle({
  connection: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN as string,
  },
  schema,
});
