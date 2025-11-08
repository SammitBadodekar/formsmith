import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import { headers } from "next/headers";
import cuid from "cuid";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_URL!,
    process.env.NEXT_PUBLIC_APP_URL!,
    // For production, use wildcard for all subdomains
    `*.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost",
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create a default workspace for every new user
          await db.insert(schema.workspace).values({
            id: cuid(),
            userId: user.id,
            name: "My Workspace",
          });
        },
      },
    },
  },
});

export async function getCurrentSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    session: session?.session ?? null,
    user: session?.user ?? null,
  };
}
