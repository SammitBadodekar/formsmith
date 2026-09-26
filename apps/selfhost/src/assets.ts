import { resolve, sep } from "node:path";

export function staticAssets(directory: string) {
  const root = resolve(directory);
  return {
    async fetch(request: Request) {
      if (request.method !== "GET" && request.method !== "HEAD")
        return new Response(null, { status: 405 });
      let pathname: string;
      try {
        pathname = decodeURIComponent(new URL(request.url).pathname);
      } catch {
        return new Response(null, { status: 400 });
      }
      const path = resolve(root, `.${pathname}`);
      if ((path !== root && !path.startsWith(root + sep)) || pathname.includes("\0"))
        return new Response(null, { status: 404 });
      let file = Bun.file(path);
      if (path === root || !(await file.exists())) {
        if (pathname.startsWith("/assets/") || pathname.includes("."))
          return new Response(null, { status: 404 });
        file = Bun.file(resolve(root, "index.html"));
      }
      if (!(await file.exists())) return new Response(null, { status: 503 });
      return new Response(request.method === "HEAD" ? null : file, {
        headers: {
          "content-type": file.type,
          "content-length": String(file.size),
          "cache-control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
          "x-content-type-options": "nosniff",
        },
      });
    },
  };
}
