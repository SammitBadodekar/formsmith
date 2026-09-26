import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import type { BetterAuthOptions } from "better-auth";
import { jwt } from "better-auth/plugins";
import { publicFetch } from "./outbound";

export const agentScopes = [
  "forms:read",
  "forms:write",
  "forms:publish",
  "submissions:read",
  "integrations:write",
  "domains:read",
  "domains:write",
] as const;

export function authOptions(config: {
  origin: string;
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
}): BetterAuthOptions {
  return {
    appName: "Formsmith",
    baseURL: config.origin,
    basePath: "/api/auth",
    secret: config.secret,
    trustedOrigins: [config.origin],
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
        prompt: "select_account consent",
        accessType: "offline",
      },
    },
    account: { encryptOAuthTokens: true },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database" },
    plugins: [
      jwt(),
      mcp({
        loginPage: "/login",
        consentPage: "/consent",
        resource: `${config.origin}/api/mcp`,
        scopes: ["openid", "profile", "email", "offline_access", ...agentScopes],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        accessTokenExpiresIn: 300,
      }),
      cimd({
        metadataProfile: "mcp-2026-07-28",
        fetchClientMetadataResource: async (input, init) => {
          const request = new Request(input, init);
          if (request.method !== "GET" && request.method !== "HEAD")
            throw new Error("Metadata transport only supports GET and HEAD");
          return publicFetch(request.url, {
            method: request.method,
            headers: Object.fromEntries(request.headers),
            signal: request.signal,
            limit: 256 * 1024,
          });
        },
      }),
    ],
  };
}
