import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;

  // Replace localhost:3000 with the actual domain for production
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  const searchParams = req.nextUrl.searchParams.toString();
  // Get the pathname of the request (e.g. /, /about, /blog/first-post)
  const path = `${url.pathname}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;

  // Rewrites for app pages (app subdomain)
  if (hostname === `app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
    // Check for session using Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    // Redirect to login if no session and not already on login page
    if (!session && !path.startsWith("/login")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Redirect away from login if already has session
    if (session && path.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Rewrite app.domain.com requests to /app folder
    return NextResponse.rewrite(
      new URL(`/app${path === "/" ? "" : path}`, req.url)
    );
  }

  // Rewrite root application to root folder (localhost:3000 or main domain)
  if (
    hostname === "localhost:3000" ||
    hostname === process.env.NEXT_PUBLIC_ROOT_DOMAIN
  ) {
    return NextResponse.rewrite(new URL(path, req.url));
  }

  // Rewrite everything else to /[domain]/[slug] dynamic route
  // This is for custom domains or other subdomains
  return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url));
}
