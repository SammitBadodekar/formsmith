import {
  generateSessionToken,
  createSession,
  setSessionTokenCookie,
  google,
} from "@/lib/auth";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";

import type { OAuth2Tokens } from "arctic";
import { db } from "@/lib/db";
import { userTable, workspaceTable } from "@formsmith/database";
import { eq } from "drizzle-orm";
import cuid from "cuid";

type googleCallbackClaims = {
  sub: string;
  name: string | null;
  email: string | null;
  picture: string | null;
};

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value ?? null;
  const codeVerifier = cookieStore.get("google_code_verifier")?.value ?? null;
  if (
    code === null ||
    state === null ||
    storedState === null ||
    codeVerifier === null
  ) {
    return new Response(null, {
      status: 400,
    });
  }
  if (state !== storedState) {
    return new Response(null, {
      status: 400,
    });
  }

  let tokens: OAuth2Tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch (e) {
    // Invalid code or client credentials
    return new Response(null, {
      status: 400,
    });
  }
  const claims = decodeIdToken(tokens.idToken()) as googleCallbackClaims;
  const googleUserId = claims.sub;

  const existingUser = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, googleUserId))
    .limit(1);

  if (existingUser[0]) {
    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, googleUserId);
    await setSessionTokenCookie(sessionToken, session.expiresAt);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  }

  await db
    .insert(userTable)
    .values({
      id: googleUserId,
      name: claims.name,
      email: claims.email,
      image: claims?.picture,
    })
    .run();

  await db
    .insert(workspaceTable)
    .values({
      id: cuid(),
      userId: googleUserId,
      name: "My Workspace",
    })
    .run();

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, googleUserId);
  await setSessionTokenCookie(sessionToken, session.expiresAt);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
    },
  });
}
