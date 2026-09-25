import { migrate } from "drizzle-orm/postgres-js/migrator";
import { connectDatabase } from "./index";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const { db, client } = connectDatabase(url, 1);
try {
  // API and job-worker deployments can start together; serialize schema changes.
  await client`SELECT pg_advisory_lock(hashtext('formsmith:migrations'))`;
  await migrate(db, {
    migrationsFolder:
      process.env.MIGRATIONS_DIR ?? new URL("../../drizzle", import.meta.url).pathname,
  });
} finally {
  await client`SELECT pg_advisory_unlock(hashtext('formsmith:migrations'))`.catch(() => {});
  await client.end();
}
