import { betterAuth } from "better-auth";
import { authOptions } from "./src/auth-options";

// Schema generation needs the real plugin configuration, but no live credentials.
export const auth = betterAuth(
  authOptions({
    origin: "http://localhost:5173",
    secret: crypto.randomUUID() + crypto.randomUUID(),
    googleClientId: "schema-generation",
    googleClientSecret: "schema-generation",
  }),
);
