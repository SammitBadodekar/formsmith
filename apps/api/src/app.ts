import { cors } from "@elysiajs/cors";
import { formSchema, hashPayload, idSchema, newId } from "@formsmith/core";
import {
  journalEntrySchema,
  parseKeyring,
  readBoundedBody,
  verifyControl,
} from "@formsmith/core/intake";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";
import { agentAccess } from "./agent-access";
import { createAuth } from "./auth";
import { agentScopes } from "./auth-options";
import type { Config } from "./config";
import type { Database } from "./db";
import { machineCredentials } from "./db/schema";
import { domainService } from "./domains";
import { responseExports } from "./exports";
import { integrationService } from "./integrations";
import { mcpService } from "./mcp";
import { repository, ServiceError } from "./repository";
import { uploadInput, uploadService } from "./uploads";

export async function createApp(db: Database, config: Config) {
  const auth = await createAuth(db, config);
  const repo = repository(db);
  const exportResponses = responseExports(db);
  const domains = domainService(db, {
    canonicalHost: new URL(config.PUBLIC_ORIGIN).hostname,
    cnameTarget: config.CUSTOM_DOMAIN_TARGET,
  });
  const controlKeys = parseKeyring(config.CONTROL_KEYS);
  const connectors = integrationService(db, config);
  const mcp = mcpService(db, config, auth);
  const files = uploadService(db, config);
  async function principal(
    request: Request,
    scope: (typeof agentScopes)[number],
    ownerOnly = false,
  ) {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (bearer?.startsWith("fs_")) {
      if (ownerOnly) throw new ServiceError(403, "Only the owner can manage agent credentials");
      const [credential] = await db
        .select()
        .from(machineCredentials)
        .where(
          and(
            eq(machineCredentials.tokenHash, await hashPayload(bearer)),
            isNull(machineCredentials.revokedAt),
            gt(machineCredentials.expiresAt, new Date()),
          ),
        );
      if (!credential) throw new ServiceError(401, "Invalid or expired machine credential");
      if (!credential.scopes.includes(scope))
        throw new ServiceError(403, `Missing scope: ${scope}`);
      return credential.ownerId;
    }
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new ServiceError(401, "Sign in to continue");
    if (
      !["GET", "HEAD"].includes(request.method) &&
      request.headers.get("origin") !== config.PUBLIC_ORIGIN
    )
      throw new ServiceError(403, "Untrusted request origin");
    return session.user.id;
  }
  const body = async (request: Request): Promise<unknown> =>
    JSON.parse(await readBoundedBody(request.body));
  async function routes(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/mcp") return mcp(request);
    const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (url.pathname === "/api/uploads/prepare" && request.method === "POST") {
      const input = uploadInput.extend({ questionId: idSchema }).parse(await body(request));
      return Response.json(await files.prepare(bearer, input.questionId, input), { status: 201 });
    }
    const uploadRoute = /^\/api\/uploads\/([^/]+)\/(complete|download)$/.exec(url.pathname);
    if (uploadRoute) {
      const id = z.string().uuid().parse(uploadRoute[1]);
      if (uploadRoute[2] === "complete" && request.method === "POST")
        return Response.json(await files.complete(bearer, id));
      if (uploadRoute[2] === "download" && request.method === "GET")
        return Response.redirect(
          await files.download(await principal(request, "submissions:read"), id),
          302,
        );
    }
    const mediaRoute = /^\/api\/media\/([^/]+)$/.exec(url.pathname);
    if (mediaRoute && request.method === "GET")
      return Response.redirect(await files.media(z.string().uuid().parse(mediaRoute[1])), 302);
    const ownerMedia = /^\/api\/forms\/([^/]+)\/media(?:\/([^/]+))?$/.exec(url.pathname);
    if (ownerMedia && request.method === "POST") {
      const owner = await principal(request, "forms:write"),
        formId = z.string().uuid().parse(ownerMedia[1]);
      return Response.json(
        ownerMedia[2]
          ? await files.completeMedia(owner, formId, z.string().uuid().parse(ownerMedia[2]))
          : await files.prepareMedia(owner, formId, uploadInput.parse(await body(request))),
        { status: ownerMedia[2] ? 200 : 201 },
      );
    }
    if (url.pathname === "/api/internal/intake/commit" && request.method === "POST") {
      const serialized = await readBoundedBody(request.body, 1024 * 1024);
      if (!(await verifyControl(request, serialized, controlKeys)))
        throw new ServiceError(401, "Invalid service signature");
      return Response.json(await repo.commit(journalEntrySchema.parse(JSON.parse(serialized))));
    }
    if (url.pathname === "/api/workspace" && request.method === "GET")
      return Response.json(await repo.workspace(await principal(request, "forms:read")));
    if (url.pathname === "/api/domains") {
      const owner = await principal(
        request,
        request.method === "GET" ? "domains:read" : "domains:write",
      );
      if (request.method === "GET") return Response.json(await domains.list(owner));
      if (request.method === "POST") {
        const input = z
          .object({ hostname: z.string().max(253), defaultFormId: z.string().uuid().optional() })
          .parse(await body(request));
        return Response.json(await domains.add(owner, input.hostname, input.defaultFormId), {
          status: 201,
        });
      }
    }
    const domainRoute = /^\/api\/domains\/([^/]+)(?:\/(verify))?$/.exec(url.pathname);
    if (domainRoute) {
      const owner = await principal(request, "domains:write"),
        id = z.string().uuid().parse(domainRoute[1]);
      if (domainRoute[2] === "verify" && request.method === "POST")
        return Response.json(await domains.verify(owner, id), { status: 202 });
      if (!domainRoute[2] && request.method === "PATCH") {
        const input = z
          .object({ defaultFormId: z.string().uuid().nullable() })
          .parse(await body(request));
        return Response.json(await domains.configure(owner, id, input.defaultFormId));
      }
      if (!domainRoute[2] && request.method === "DELETE")
        return Response.json(await domains.remove(owner, id), { status: 202 });
    }
    if (url.pathname === "/api/forms") {
      if (request.method === "GET")
        return Response.json(
          await repo.list(
            await principal(request, "forms:read"),
            Object.fromEntries(url.searchParams),
          ),
        );
      if (request.method === "POST") {
        const ownerId = await principal(request, "forms:write");
        const input = z.object({ definition: formSchema.optional() }).parse(await body(request));
        return Response.json(await repo.create(ownerId, input.definition), { status: 201 });
      }
    }
    const connectorRoute =
      /^\/api\/forms\/([^/]+)\/integrations(?:\/([^/]+))?(?:\/retry\/([^/]+))?$/.exec(url.pathname);
    if (connectorRoute) {
      const formId = z.string().uuid().parse(connectorRoute[1]);
      const integrationId = connectorRoute[2] ? z.string().uuid().parse(connectorRoute[2]) : null;
      const owner = await principal(
        request,
        request.method === "GET" ? "forms:read" : "integrations:write",
      );
      if (!integrationId && request.method === "GET")
        return Response.json(await connectors.list(owner, formId));
      if (!integrationId && request.method === "POST") {
        const input = z
          .discriminatedUnion("kind", [
            z.object({
              kind: z.literal("webhook"),
              name: z.string().trim().min(1).max(100),
              url: z.string().url().max(2000),
            }),
            z.object({ kind: z.literal("sheets"), spreadsheetId: z.string().min(20).max(200) }),
          ])
          .parse(await body(request));
        return Response.json(
          input.kind === "webhook"
            ? await connectors.addWebhook(owner, formId, input)
            : await connectors.addSheets(owner, formId, input),
          { status: 201 },
        );
      }
      if (integrationId && !connectorRoute[3] && request.method === "PATCH") {
        const input = z.object({ enabled: z.boolean() }).parse(await body(request));
        return Response.json(
          await connectors.setEnabled(owner, formId, integrationId, input.enabled),
        );
      }
      if (integrationId && connectorRoute[3] && request.method === "POST")
        return Response.json(
          await connectors.retry(
            owner,
            formId,
            integrationId,
            z.string().uuid().parse(connectorRoute[3]),
          ),
          { status: 202 },
        );
    }
    const versionRoute = /^\/api\/forms\/([^/]+)\/versions\/([^/]+)$/.exec(url.pathname);
    if (versionRoute && request.method === "GET")
      return Response.json(
        await repo.version(
          await principal(request, "submissions:read"),
          z.string().uuid().parse(versionRoute[1]),
          z.string().uuid().parse(versionRoute[2]),
        ),
      );
    const formRoute = /^\/api\/forms\/([^/]+)(?:\/(publish|closed|submissions|export))?$/.exec(
      url.pathname,
    );
    if (formRoute) {
      const formId = z.string().uuid().parse(formRoute[1]);
      const action = formRoute[2];
      if (!action && request.method === "GET")
        return Response.json(await repo.owned(await principal(request, "forms:read"), formId));
      if (!action && request.method === "PATCH") {
        const ownerId = await principal(request, "forms:write");
        const input = z
          .object({ revision: z.number().int().positive(), definition: formSchema })
          .parse(await body(request));
        return Response.json(await repo.save(ownerId, formId, input.revision, input.definition));
      }
      if (action === "publish" && request.method === "POST") {
        const ownerId = await principal(request, "forms:publish");
        const input = z
          .object({ revision: z.number().int().positive() })
          .parse(await body(request));
        return Response.json(await repo.publish(ownerId, formId, input.revision), { status: 202 });
      }
      if (action === "closed" && request.method === "PATCH") {
        const ownerId = await principal(request, "forms:publish");
        const input = z.object({ closed: z.boolean() }).parse(await body(request));
        return Response.json(await repo.setClosed(ownerId, formId, input.closed), { status: 202 });
      }
      if (action === "submissions" && request.method === "GET")
        return Response.json(
          await repo.responses(
            await principal(request, "submissions:read"),
            formId,
            Object.fromEntries(url.searchParams),
          ),
        );
      if (action === "export" && request.method === "GET") {
        if (url.searchParams.get("type") === "form")
          return Response.json(
            (await repo.owned(await principal(request, "forms:read"), formId)).draft,
            { headers: { "content-disposition": `attachment; filename="form-${formId}.json"` } },
          );
        const format = z.enum(["json", "csv"]).parse(url.searchParams.get("format") ?? "json");
        return exportResponses(
          await principal(request, "submissions:read"),
          formId,
          format,
          request.signal,
        );
      }
    }
    const connectionRoute = /^\/api\/connections\/([^/]+)$/.exec(url.pathname);
    if (connectionRoute && request.method === "DELETE") {
      await agentAccess(db).revoke(
        await principal(request, "forms:read", true),
        z.string().min(1).max(200).parse(connectionRoute[1]),
      );
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/api/credentials") {
      const ownerId = await principal(request, "forms:read", true);
      if (request.method === "GET")
        return Response.json(
          await db
            .select({
              id: machineCredentials.id,
              name: machineCredentials.name,
              scopes: machineCredentials.scopes,
              expiresAt: machineCredentials.expiresAt,
              revokedAt: machineCredentials.revokedAt,
            })
            .from(machineCredentials)
            .where(eq(machineCredentials.ownerId, ownerId))
            .orderBy(desc(machineCredentials.createdAt)),
        );
      if (request.method === "POST") {
        const input = z
          .object({
            name: z.string().trim().min(1).max(100),
            scopes: z.array(z.enum(agentScopes)).min(1),
            days: z.number().int().min(1).max(365).default(30),
          })
          .parse(await body(request));
        const token = `fs_${newId().replaceAll("-", "")}${newId().replaceAll("-", "")}`;
        const [created] = await db
          .insert(machineCredentials)
          .values({
            ownerId,
            name: input.name,
            scopes: [...new Set(input.scopes)],
            tokenHash: await hashPayload(token),
            expiresAt: new Date(Date.now() + input.days * 86400000),
          })
          .returning({ id: machineCredentials.id });
        return Response.json({ ...created, token }, { status: 201 });
      }
    }
    const revoke = /^\/api\/credentials\/([^/]+)$/.exec(url.pathname);
    if (revoke && request.method === "DELETE") {
      const ownerId = await principal(request, "forms:read", true);
      const id = z.string().uuid().parse(revoke[1]);
      await db
        .update(machineCredentials)
        .set({ revokedAt: new Date() })
        .where(and(eq(machineCredentials.id, id), eq(machineCredentials.ownerId, ownerId)));
      return new Response(null, { status: 204 });
    }
    throw new ServiceError(404, "Route not found");
  }
  return new Elysia()
    .use(
      cors({
        origin: config.PUBLIC_ORIGIN,
        credentials: true,
        allowedHeaders: ["content-type", "authorization"],
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      }),
    )
    .onError(({ error, set }) => {
      if (error instanceof ServiceError) {
        set.status = error.status;
        return { error: error.message, details: error.details };
      }
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        set.status = 400;
        return { error: "Invalid request" };
      }
      if (error instanceof RangeError) {
        set.status = 413;
        return { error: "Request exceeds size limit" };
      }
      console.error(
        JSON.stringify({
          event: "api.request_failed",
          type: error instanceof Error ? error.name : "unknown",
        }),
      );
      set.status = 503;
      return { error: "Service temporarily unavailable. Retry with the same request identity." };
    })
    .onAfterHandle(({ set }) => {
      set.headers["cache-control"] = "no-store";
      set.headers["x-content-type-options"] = "nosniff";
    })
    .get("/health", () => ({ status: "ok" }))
    .get("/ready", async ({ set }) => {
      try {
        await db.$client`SELECT 1`;
        return { status: "ready" };
      } catch {
        set.status = 503;
        return { status: "unavailable" };
      }
    })
    .all("/api/auth/*", ({ request }) => auth.handler(request), { parse: "none" })
    .all("/.well-known/*", ({ request }) => auth.handler(request), { parse: "none" })
    .all("/api/*", ({ request }) => routes(request), { parse: "none" });
}
