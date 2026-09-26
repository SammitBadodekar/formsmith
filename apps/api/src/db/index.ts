import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function connectDatabase(url: string, maxConnections = 10) {
  const client = postgres(url, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 5,
    connection: { application_name: "formsmith", statement_timeout: 15000 },
  });
  const db = drizzle(client, { schema });
  return { db, client };
}
export type Database = ReturnType<typeof connectDatabase>["db"];
