import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@formsmith/database";

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN as string,
  },
  schema,
});
