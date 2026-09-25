import { domainManifestSchema } from "@formsmith/core/intake";

interface RequestTarget {
  fetch(request: Request): Promise<Response>;
}
export interface GatewayOptions {
  PUBLIC_HOST: string;
  API_URL: string;
  JOURNAL: { get(key: string): Promise<{ json(): Promise<unknown> } | null> };
  INTAKE: RequestTarget;
  FORMS: RequestTarget;
  ASSETS: RequestTarget;
}

export async function handleGatewayRequest(request: Request, env: GatewayOptions) {
  const url = new URL(request.url),
    canonical =
      url.hostname === env.PUBLIC_HOST || ["127.0.0.1", "localhost"].includes(url.hostname);
  const unavailable = (status: number, error: string) =>
    Response.json(
      { error },
      { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } },
    );
  try {
    let domain: ReturnType<typeof domainManifestSchema.parse> | null = null;
    if (!canonical) {
      const record = await env.JOURNAL.get(`domains/${url.hostname}`);
      if (!record) return unavailable(404, "Domain is not connected");
      domain = domainManifestSchema.parse(await record.json());
      if (!domain.active || domain.hostname !== url.hostname)
        return unavailable(404, "Domain is not connected");
      if (domain.validUntil <= Date.now())
        return unavailable(503, "Domain availability must be refreshed");
    }
    if (url.pathname.startsWith("/intake/")) {
      const path = url.pathname.slice("/intake".length);
      if (!/^\/(forms\/[^/]+\/attempts|attempt|receipt|submissions|domain\/attempts)$/.test(path))
        return unavailable(404, "Route not found");
      url.pathname = path;
      const forward = new Request(url, request);
      forward.headers.delete("cookie");
      return env.INTAKE.fetch(forward);
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.well-known/")) {
      const publicUpload =
        /^\/api\/uploads\/(prepare|[0-9a-f-]{36}\/complete)$/.test(url.pathname) &&
        request.method === "POST";
      const publicMedia =
        /^\/api\/media\/[0-9a-f-]{36}$/.test(url.pathname) && request.method === "GET";
      if (!canonical && !publicUpload && !publicMedia) return unavailable(404, "Route not found");
      if (url.pathname.startsWith("/api/internal/")) return unavailable(404, "Route not found");
      const upstream = new URL(env.API_URL);
      upstream.pathname = url.pathname;
      upstream.search = url.search;
      const headers = new Headers(request.headers);
      headers.set("x-forwarded-host", url.host);
      headers.set("x-forwarded-proto", url.protocol.slice(0, -1));
      headers.delete("host");
      if (!canonical) headers.delete("cookie");
      return fetch(
        new Request(upstream, {
          method: request.method,
          headers,
          body: request.body,
          redirect: "manual",
        }),
      );
    }
    const formPath = /^\/f\/([a-zA-Z0-9_-]+)\/?$/.exec(url.pathname);
    if (formPath || url.pathname.startsWith("/f/assets/") || (!canonical && url.pathname === "/")) {
      if (!["GET", "HEAD"].includes(request.method)) return unavailable(405, "Method not allowed");
      if (domain && formPath && !domain.formIds.includes(formPath[1] ?? ""))
        return unavailable(404, "Form not found on this domain");
      if (domain && url.pathname === "/" && !domain.defaultFormId)
        return unavailable(404, "No default form on this domain");
      url.pathname = url.pathname.startsWith("/f/assets/") ? url.pathname.slice(2) : "/";
      const forward = new Request(url, request);
      forward.headers.delete("cookie");
      const response = await env.FORMS.fetch(forward);
      const secured = new Response(response.body, response);
      secured.headers.delete("set-cookie");
      secured.headers.set("x-content-type-options", "nosniff");
      return secured;
    }
    if (!canonical) return unavailable(404, "Route not found");
    return env.ASSETS.fetch(request);
  } catch {
    console.error(JSON.stringify({ event: "gateway.request_failed" }));
    return unavailable(503, "Temporarily unavailable. Please retry shortly.");
  }
}
