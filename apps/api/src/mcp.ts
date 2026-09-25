import { requireMcpAuth } from "@better-auth/mcp";
import {
  applyOperations,
  formOperationSchema,
  formSchema,
  hashPayload,
  validateDefinition,
} from "@formsmith/core";
import { readBoundedBody } from "@formsmith/core/intake";
import {
  createMcpHandler,
  McpServer,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { createInsufficientScopeError } from "better-auth/oauth2";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { agentAccess } from "./agent-access";
import type { createAuth } from "./auth";
import type { Config } from "./config";
import type { Database } from "./db";
import { machineCredentials } from "./db/schema";
import { domainService } from "./domains";
import { integrationService } from "./integrations";
import { formListQuery, pageQuery } from "./pagination";
import { repository, ServiceError } from "./repository";

const toolScopes: Record<string, string> = {
  forms_list: "forms:read",
  form_get: "forms:read",
  form_get_version: "forms:read",
  form_validate: "forms:read",
  form_export: "forms:read",
  form_create: "forms:write",
  form_save: "forms:write",
  form_apply_operations: "forms:write",
  form_publish: "forms:publish",
  form_set_closed: "forms:publish",
  submissions_list: "submissions:read",
  integrations_list: "forms:read",
  webhook_create: "integrations:write",
  sheets_connect: "integrations:write",
  integration_set_enabled: "integrations:write",
  delivery_retry: "integrations:write",
  domains_list: "domains:read",
  domain_connect: "domains:write",
  domain_verify: "domains:write",
  domain_configure: "domains:write",
  domain_disconnect: "domains:write",
};
const formIdentity = z.object({ formId: z.string().uuid() });
const revisionIdentity = formIdentity.extend({ revision: z.number().int().positive() });
export function mcpService(
  db: Database,
  config: Config,
  auth: Awaited<ReturnType<typeof createAuth>>,
) {
  const repo = repository(db),
    connectors = integrationService(db, config),
    domains = domainService(db, {
      canonicalHost: new URL(config.PUBLIC_ORIGIN).hostname,
      cnameTarget: config.CUSTOM_DOMAIN_TARGET,
    }),
    resource = `${config.PUBLIC_ORIGIN}/api/mcp`;
  const response = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  });
  function server(ownerId: string, granted: Set<string>) {
    const server = new McpServer({ name: "formsmith", version: "0.1.0" });
    function tool<S extends z.ZodObject>(
      name: string,
      description: string,
      inputSchema: S,
      run: (input: z.infer<S>) => Promise<unknown>,
      readonly = false,
    ) {
      const schema: StandardSchemaWithJSON = inputSchema;
      server.registerTool(
        name,
        {
          description,
          inputSchema: schema,
          annotations: {
            readOnlyHint: readonly,
            destructiveHint: !readonly && name !== "form_create",
            idempotentHint: readonly || name === "form_set_closed",
            openWorldHint: [
              "webhook_create",
              "sheets_connect",
              "delivery_retry",
              "form_publish",
              "domain_verify",
              "domain_configure",
              "domain_disconnect",
            ].includes(name),
          },
        },
        async (input) => {
          if (!granted.has(toolScopes[name] ?? "forms:read"))
            return { isError: true, ...response({ error: `Missing scope: ${toolScopes[name]}` }) };
          try {
            return response(await run(inputSchema.parse(input)));
          } catch (error) {
            if (error instanceof ServiceError)
              return {
                isError: true,
                ...response({ error: error.message, status: error.status, details: error.details }),
              };
            if (error instanceof z.ZodError)
              return {
                isError: true,
                ...response({ error: "Invalid form definition", issues: error.issues }),
              };
            return {
              isError: true,
              ...response({
                error: "Operation failed. Read the current form state before retrying a mutation.",
              }),
            };
          }
        },
      );
    }
    tool(
      "forms_list",
      "List lightweight form summaries, newest created first. Follow nextCursor until null; use form_get to read the draft. Optional search matches the title.",
      formListQuery,
      async (input) => repo.list(ownerId, input),
      true,
    );
    tool(
      "form_get",
      "Read a draft, its edit revision, published version and publication synchronization state.",
      formIdentity,
      async ({ formId }) => repo.owned(ownerId, formId),
      true,
    );
    tool(
      "form_get_version",
      "Read an immutable published definition, including the labels and option IDs used by historical responses.",
      formIdentity.extend({ versionId: z.string().uuid() }),
      async ({ formId, versionId }) => repo.version(ownerId, formId, versionId),
      true,
    );
    tool(
      "form_create",
      "Create a new form, optionally importing a schemaVersion 1 definition. The server assigns a new form ID.",
      z.object({ definition: formSchema.optional() }),
      async ({ definition }) => repo.create(ownerId, definition),
    );
    tool(
      "form_save",
      "Replace the draft with expected revision. A 409 means another editor changed it: read and reconcile instead of blindly retrying. Incomplete drafts can be saved.",
      revisionIdentity.extend({ definition: formSchema }),
      async ({ formId, revision, definition }) => repo.save(ownerId, formId, revision, definition),
    );
    tool(
      "form_apply_operations",
      "Apply an atomic batch of insert, update, move, duplicate or delete operations using stable block IDs and expected revision. Questions own their label, help and input.",
      revisionIdentity.extend({ operations: z.array(formOperationSchema).min(1).max(100) }),
      async ({ formId, revision, operations }) => {
        const current = await repo.owned(ownerId, formId);
        if (current.revision !== revision)
          throw new ServiceError(409, "Read the latest revision before applying operations");
        return repo.save(ownerId, formId, revision, applyOperations(current.draft, operations));
      },
    );
    tool(
      "form_validate",
      "Check publishability, broken references and circular logic. Returns exact repair locations without changing the draft.",
      formIdentity,
      async ({ formId }) => {
        const form = await repo.owned(ownerId, formId);
        return { revision: form.revision, issues: validateDefinition(form.draft) };
      },
      true,
    );
    tool(
      "form_publish",
      "Publish an immutable version from the saved revision. Respondents already started stay pinned to their original version. Read form_get until syncedPolicyRevision reaches policyRevision.",
      revisionIdentity,
      async ({ formId, revision }) => ({
        ...(await repo.publish(ownerId, formId, revision)),
        url: `${config.PUBLIC_ORIGIN}/f/${formId}`,
      }),
    );
    tool(
      "form_set_closed",
      "Close or reopen admission for a published form. Accepted submissions continue processing; closure takes effect when edge synchronization completes.",
      formIdentity.extend({ closed: z.boolean() }),
      async ({ formId, closed }) => repo.setClosed(ownerId, formId, closed),
    );
    tool(
      "submissions_list",
      "Read committed submissions, newest first. Follow nextCursor until null. Pending intake receipts may not be committed yet.",
      formIdentity.extend(pageQuery.shape),
      async ({ formId, ...input }) => repo.responses(ownerId, formId, input),
      true,
    );
    tool(
      "form_export",
      "Export portable Formsmith JSON suitable for form_create import.",
      formIdentity,
      async ({ formId }) => (await repo.owned(ownerId, formId)).draft,
      true,
    );
    tool(
      "integrations_list",
      "List connector configuration and recent delivery status without signing secrets or OAuth credentials.",
      formIdentity,
      async ({ formId }) => ({ integrations: await connectors.list(ownerId, formId) }),
      true,
    );
    tool(
      "webhook_create",
      "Connect a public HTTPS webhook. Returns a signing secret once; store it securely. Deliveries include stable event IDs and HMAC signatures.",
      formIdentity.extend({ name: z.string().min(1).max(100), url: z.string().url() }),
      async ({ formId, name, url }) => connectors.addWebhook(ownerId, formId, { name, url }),
    );
    tool(
      "sheets_connect",
      "Connect a Google spreadsheet after the owner grants Google Sheets access in the dashboard. Creates a dedicated connector tab on first delivery.",
      formIdentity.extend({ spreadsheetId: z.string().min(20).max(200) }),
      async ({ formId, spreadsheetId }) => connectors.addSheets(ownerId, formId, { spreadsheetId }),
    );
    tool(
      "integration_set_enabled",
      "Enable or disable a connector for this form.",
      formIdentity.extend({ integrationId: z.string().uuid(), enabled: z.boolean() }),
      async ({ formId, integrationId, enabled }) =>
        connectors.setEnabled(ownerId, formId, integrationId, enabled),
    );
    tool(
      "delivery_retry",
      "Retry a failed connector delivery, preserving its stable event identity.",
      formIdentity.extend({ integrationId: z.string().uuid(), jobId: z.string().uuid() }),
      async ({ formId, integrationId, jobId }) =>
        connectors.retry(ownerId, formId, integrationId, jobId),
    );
    tool(
      "domains_list",
      "List the owner's custom hostnames, DNS instructions and certificate status.",
      z.object({}),
      async () => ({ domains: await domains.list(ownerId) }),
      true,
    );
    tool(
      "domain_connect",
      "Claim a hostname and return its required DNS records. Routing remains disabled until ownership and TLS verification complete.",
      z.object({ hostname: z.string().max(253), defaultFormId: z.string().uuid().optional() }),
      async ({ hostname, defaultFormId }) => domains.add(ownerId, hostname, defaultFormId),
    );
    tool(
      "domain_verify",
      "Verify the owner's DNS proof and queue certificate/routing provisioning. Read domains_list for progress.",
      z.object({ domainId: z.string().uuid() }),
      async ({ domainId }) => domains.verify(ownerId, domainId),
    );
    tool(
      "domain_configure",
      "Set or clear a domain's default form. The form must belong to this owner.",
      z.object({ domainId: z.string().uuid(), defaultFormId: z.string().uuid().nullable() }),
      async ({ domainId, defaultFormId }) => domains.configure(ownerId, domainId, defaultFormId),
    );
    tool(
      "domain_disconnect",
      "Stop custom-domain routing and release ownership after revocation and provider cleanup complete. Read domains_list for progress.",
      z.object({ domainId: z.string().uuid() }),
      async ({ domainId }) => domains.remove(ownerId, domainId),
    );
    server.registerResource(
      "form_schema",
      "formsmith://schema/v1",
      {
        mimeType: "application/schema+json",
        description:
          "Canonical portable form definition schema. Semantic checks such as reference validity run at publication.",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "application/schema+json",
            text: JSON.stringify(z.toJSONSchema(formSchema)),
          },
        ],
      }),
    );
    return server;
  }
  async function needed(request: Request) {
    if (request.method !== "POST") return null;
    const body: unknown = JSON.parse(await readBoundedBody(request.clone().body));
    const parsed = z
      .object({
        method: z.string(),
        params: z.object({ name: z.string() }).passthrough().optional(),
      })
      .passthrough()
      .safeParse(body);
    return parsed.success && parsed.data.method === "tools/call"
      ? (toolScopes[parsed.data.params?.name ?? ""] ?? "forms:read")
      : null;
  }
  const handle = (request: Request, ownerId: string, scopes: Set<string>) =>
    createMcpHandler(() => server(ownerId, scopes), { legacy: "stateless" }).fetch(request);
  const oauth = requireMcpAuth(
    auth,
    async (request, claims) => {
      const scope = await needed(request),
        scopes = new Set(typeof claims.scope === "string" ? claims.scope.split(" ") : []);
      if (!claims.sub) throw new ServiceError(401, "Token has no owner identity");
      const consent = await agentAccess(db).permissions(
        claims.sub,
        claims.client_id,
        claims.iat,
        resource,
      );
      if (!consent)
        return Response.json(
          { error: "Agent connection was revoked. Reconnect to continue." },
          {
            status: 401,
            headers: {
              "www-authenticate": `Bearer error="invalid_token", resource_metadata="${config.PUBLIC_ORIGIN}/.well-known/oauth-protected-resource/api/mcp"`,
            },
          },
        );
      for (const value of scopes) if (!consent.has(value)) scopes.delete(value);
      if (scope && !scopes.has(scope)) throw createInsufficientScopeError([scope]);
      return handle(request, claims.sub, scopes);
    },
    { resource, challengeScopes: ["forms:read"] },
  );
  return async (request: Request) => {
    const canonical = new URL(request.url);
    canonical.protocol = new URL(config.PUBLIC_ORIGIN).protocol;
    canonical.host = new URL(config.PUBLIC_ORIGIN).host;
    request = new Request(canonical, request);
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token?.startsWith("fs_")) return oauth(request);
    const [credential] = await db
      .select()
      .from(machineCredentials)
      .where(
        and(
          eq(machineCredentials.tokenHash, await hashPayload(token)),
          isNull(machineCredentials.revokedAt),
          gt(machineCredentials.expiresAt, new Date()),
        ),
      );
    if (!credential)
      return Response.json({ error: "Invalid or expired machine credential" }, { status: 401 });
    const scope = await needed(request);
    if (scope && !credential.scopes.includes(scope))
      return Response.json({ error: `Missing scope: ${scope}` }, { status: 403 });
    return handle(request, credential.ownerId, new Set(credential.scopes));
  };
}
