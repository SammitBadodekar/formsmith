import { generateState } from "arctic";
import { cookies } from "next/headers";
import { GitHub } from "arctic";
import { github } from "@/lib/auth";

export async function GET(): Promise<Response> {
  const state = generateState();
  const url = github.createAuthorizationURL(state, ["read:user", "user:email"]);

  const cookieStore = await cookies();
  cookieStore.set("github_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
    domain: `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
    },
  });
}
