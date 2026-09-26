import { newId } from "@formsmith/core";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authOptions } from "./auth-options";
import type { Config } from "./config";
import type { Database } from "./db";
import * as schema from "./db/schema";

function initializeAuth(db: Database, config: Config) {
  return betterAuth({
    ...authOptions({
      origin: config.PUBLIC_ORIGIN,
      secret: config.BETTER_AUTH_SECRET,
      googleClientId: config.GOOGLE_CLIENT_ID,
      googleClientSecret: config.GOOGLE_CLIENT_SECRET,
    }),
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
  });
}
const instances = new WeakMap<Database, Map<string, Promise<ReturnType<typeof initializeAuth>>>>();
export function createAuth(
  db: Database,
  config: Config,
): Promise<ReturnType<typeof initializeAuth>> {
  let origins = instances.get(db);
  if (!origins) {
    origins = new Map();
    instances.set(db, origins);
  }
  let auth = origins.get(config.PUBLIC_ORIGIN);
  if (!auth) {
    auth = (async () => {
      // Seed with a database conflict guard before the provider's read/create
      // initialization so simultaneous Railway replicas can start safely.
      const identifier = `${config.PUBLIC_ORIGIN}/api/mcp`;
      await db
        .insert(schema.oauthResource)
        .values({
          id: newId(),
          identifier,
          name: "Formsmith MCP",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: schema.oauthResource.identifier });
      const instance = initializeAuth(db, config);
      await instance.$context;
      return instance;
    })();
    origins.set(config.PUBLIC_ORIGIN, auth);
  }
  return auth;
}
