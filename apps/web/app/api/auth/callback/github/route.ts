import {
  generateSessionToken,
  createSession,
  setSessionTokenCookie,
} from "@/lib/auth";
import { github } from "../../github/route";
import { cookies } from "next/headers";

import type { OAuth2Tokens } from "arctic";
import { userTable } from "@formsmith/database";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("github_oauth_state")?.value ?? null;
  if (code === null || state === null || storedState === null) {
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
    tokens = await github.validateAuthorizationCode(code);
  } catch (e) {
    // Invalid code or client credentials
    return new Response(null, {
      status: 400,
    });
  }
  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken()}`,
    },
  });
  const githubUser = await githubUserResponse.json();
  console.log("here in github callback", githubUser);
  const githubUserId = githubUser.id;

  const existingUser = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, githubUserId))
    .limit(1);

  if (existingUser[0]) {
    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, githubUserId);
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
      id: githubUserId,
      name: githubUser?.login,
      email: githubUser?.email,
      image: githubUser?.avatar_url,
    })
    .run();

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, githubUserId);
  await setSessionTokenCookie(sessionToken, session.expiresAt);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
    },
  });
}
