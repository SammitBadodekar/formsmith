import {
  generateSessionToken,
  createSession,
  setSessionTokenCookie,
} from "@/lib/auth";
import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";

import type { OAuth2Tokens } from "arctic";
import { google } from "../../google/route";
import { db } from "@/lib/db";
import { userTable } from "@formsmith/database";
import { eq } from "drizzle-orm";

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
