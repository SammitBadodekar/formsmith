import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  fetchOptions: {
    credentials: "include", // Important for cross-origin cookie handling
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
