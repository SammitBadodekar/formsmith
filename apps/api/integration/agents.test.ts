import { afterAll, beforeAll, expect, test } from "bun:test";
import { createHash, createHmac } from "node:crypto";
import { hashPayload, newId } from "@formsmith/core";
import { eq, inArray } from "drizzle-orm";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth";
import { loadConfig } from "../src/config";
import { connectDatabase } from "../src/db";
import {
  customDomains,
  forms,
  machineCredentials,
  oauthClient,
  oauthResource,
  user,
  workspaces,
} from "../src/db/schema";
import { repository } from "../src/repository";

const config = loadConfig();
if (
  new URL(config.DATABASE_URL).hostname !== "127.0.0.1" ||
  new URL(config.DATABASE_URL).port !== "54329"
)
  throw new Error("Use the isolated integration database");
const { db, client } = connectDatabase(config.DATABASE_URL, 5);
let app: Awaited<ReturnType<typeof createApp>>;
const server = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  fetch: (request) => app.handle(request),
});
config.PUBLIC_ORIGIN = server.url.origin;
app = await createApp(db, config);
const auth = await createAuth(db, config),
  repo = repository(db);
const owners = [newId(), newId()];
const clients: string[] = [];
const workspaceIds: string[] = [];
let cookie = "",
  foreignFormId = "";
let sequence = 0;
beforeAll(async () => {
  for (const owner of owners) {
    await db.insert(user).values({
      id: owner,
      name: "Agent integration test",
      email: `${owner}@example.invalid`,
      emailVerified: true,
    });
    workspaceIds.push((await repo.workspace(owner)).id);
  }
  foreignFormId = (await repo.create(owners[1] as string))?.id ?? "";
  const context = await auth.$context;
  const session = await context.internalAdapter.createSession(owners[0] as string);
  if (!session) throw new Error("Session fixture failed");
  const signature = createHmac("sha256", config.BETTER_AUTH_SECRET)
    .update(session.token)
    .digest("base64");
  cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
});
afterAll(async () => {
  server.stop(true);
  if (clients.length) await db.delete(oauthClient).where(inArray(oauthClient.clientId, clients));
  await db
    .delete(oauthResource)
    .where(eq(oauthResource.identifier, `${config.PUBLIC_ORIGIN}/api/mcp`));
  await db.delete(machineCredentials).where(inArray(machineCredentials.ownerId, owners));
  await db.delete(customDomains).where(inArray(customDomains.workspaceId, workspaceIds));
  await db.delete(forms).where(inArray(forms.workspaceId, workspaceIds));
  await db.delete(workspaces).where(inArray(workspaces.id, workspaceIds));
  await db.delete(user).where(inArray(user.id, owners));
  await client.end();
});

test("Google Sheets linking requests offline access, consent and PKCE", async () => {
  const response = await fetch(`${server.url}api/auth/link-social`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: server.url.origin, cookie },
    body: JSON.stringify({
      provider: "google",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      callbackURL: "/",
      disableRedirect: true,
    }),
  });
  expect(response.status).toBe(200);
  const authorization = new URL((await response.json()).url);
  expect(authorization.origin).toBe("https://accounts.google.com");
  expect(authorization.searchParams.get("access_type")).toBe("offline");
  expect(authorization.searchParams.get("prompt")?.split(" ")).toContain("consent");
  expect(authorization.searchParams.get("scope")?.split(" ")).toContain(
    "https://www.googleapis.com/auth/spreadsheets",
  );
  expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
  expect(authorization.searchParams.get("redirect_uri")).toBe(
    `${server.url.origin}/api/auth/callback/google`,
  );
});

test("domain tools require separate grants and cannot configure another owner's form", async () => {
  const reader = await credential(["forms:read"]);
  expect(
    (await call(reader.token, "tools/call", { name: "domains_list", arguments: {} })).status,
  ).toBe(403);
  const manager = await credential(["domains:read", "domains:write"]);
  const claim = await call(manager.token, "tools/call", {
    name: "domain_connect",
    arguments: { hostname: `forms-${newId()}.example.org` },
  });
  expect(claim.body.result.isError).not.toBe(true);
  const domain = JSON.parse(claim.body.result.content[0].text);
  expect(domain.status).toBe("pending");
  expect(domain.records.some((r: { type: string }) => r.type === "TXT")).toBe(true);
  const foreign = await call(manager.token, "tools/call", {
    name: "domain_configure",
    arguments: { domainId: domain.id, defaultFormId: foreignFormId },
  });
  expect(JSON.parse(foreign.body.result.content[0].text).status).toBe(404);
  const disconnected = await call(manager.token, "tools/call", {
    name: "domain_disconnect",
    arguments: { domainId: domain.id },
  });
  expect(JSON.parse(disconnected.body.result.content[0].text).status).toBe("removed");
});
async function call(token: string | undefined, method: string, params?: unknown) {
  const response = await fetch(`${server.url}api/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-11-25",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++sequence, method, params }),
  });
  const raw = await response.text();
  const serialized = response.headers.get("content-type")?.includes("text/event-stream")
    ? raw
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6)
    : raw;
  return {
    status: response.status,
    headers: response.headers,
    body: serialized ? JSON.parse(serialized) : null,
  };
}
async function credential(scopes: string[]) {
  const token = `fs_${newId()}${newId()}`;
  const [row] = await db
    .insert(machineCredentials)
    .values({
      ownerId: owners[0] as string,
      name: "Test",
      scopes,
      tokenHash: await hashPayload(token),
      expiresAt: new Date(Date.now() + 60000),
    })
    .returning();
  if (!row) throw new Error("Credential fixture missing");
  return { token, row };
}
test("MCP discovery, scoped connection, ownership and immediate machine revocation", async () => {
  const unauthenticated = await call(undefined, "tools/list");
  expect(unauthenticated.status).toBe(401);
  expect(unauthenticated.headers.get("www-authenticate")).toContain("oauth-protected-resource");
  const publish = await credential(["forms:publish"]);
  const handshake = await call(publish.token, "initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "Formsmith test", version: "1" },
  });
  expect(handshake.status).toBe(200);
  expect(handshake.body.result.serverInfo.name).toBe("formsmith");
  expect((await call(publish.token, "tools/list")).body.result.tools.length).toBeGreaterThan(10);
  expect(
    (await call(publish.token, "tools/call", { name: "forms_list", arguments: {} })).status,
  ).toBe(403);
  const writer = await credential(["forms:read", "forms:write"]);
  const created = await call(writer.token, "tools/call", { name: "form_create", arguments: {} });
  expect(created.body.result.isError).not.toBe(true);
  const form = JSON.parse(created.body.result.content[0].text);
  expect(form.revision).toBe(1);
  const saved = await call(writer.token, "tools/call", {
    name: "form_save",
    arguments: { formId: form.id, revision: 1, definition: { ...form.draft, title: "Agent form" } },
  });
  expect(JSON.parse(saved.body.result.content[0].text).revision).toBe(2);
  const conflict = await call(writer.token, "tools/call", {
    name: "form_save",
    arguments: { formId: form.id, revision: 1, definition: form.draft },
  });
  expect(conflict.body.result.isError).toBe(true);
  expect(JSON.parse(conflict.body.result.content[0].text).status).toBe(409);
  const foreign = await call(writer.token, "tools/call", {
    name: "form_get",
    arguments: { formId: foreignFormId },
  });
  expect(foreign.body.result.isError).toBe(true);
  expect(JSON.parse(foreign.body.result.content[0].text).status).toBe(404);
  expect(
    (
      await fetch(`${server.url}api/credentials`, {
        headers: { authorization: `Bearer ${writer.token}` },
      })
    ).status,
  ).toBe(403);
  await db
    .update(machineCredentials)
    .set({ revokedAt: new Date() })
    .where(eq(machineCredentials.id, writer.row.id));
  expect((await call(writer.token, "tools/list")).status).toBe(401);
});

test("OAuth PKCE consent grants scoped MCP access and disconnect revokes JWT and refresh", async () => {
  const discovery = await fetch(`${server.url}.well-known/oauth-authorization-server/api/auth`);
  expect(discovery.status).toBe(200);
  const metadata = await discovery.json();
  const registration = await fetch(metadata.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Integration test agent",
      application_type: "native",
      redirect_uris: ["http://127.0.0.1:19876/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "forms:read offline_access",
    }),
  });
  const registered = await registration.json();
  expect({
    status: registration.status,
    error: registered.error,
    description: registered.error_description,
  }).toEqual({ status: 201, error: undefined, description: undefined });
  const clientId: string = registered.client_id;
  clients.push(clientId);
  const verifier = `${newId()}${newId()}`.replaceAll("-", "");
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: "http://127.0.0.1:19876/callback",
    response_type: "code",
    scope: "forms:read offline_access",
    resource: `${server.url}api/mcp`,
    state: newId(),
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  const authorize = await fetch(`${metadata.authorization_endpoint}?${query}`, {
    headers: { cookie },
    redirect: "manual",
  });
  expect(authorize.status).toBe(302);
  const consentUrl = new URL(authorize.headers.get("location") ?? "", server.url);
  expect(consentUrl.pathname).toBe("/consent");
  const consent = await fetch(`${server.url}api/auth/oauth2/consent`, {
    method: "POST",
    headers: { cookie, origin: server.url.origin, "content-type": "application/json" },
    body: JSON.stringify({ accept: true, oauth_query: consentUrl.search.slice(1) }),
  });
  expect(consent.status).toBe(200);
  const consentResult = await consent.json();
  const redirect = new URL(consentResult.url);
  expect(redirect.searchParams.get("state")).toBe(query.get("state"));
  const exchange = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: query.get("redirect_uri") ?? "",
      code: redirect.searchParams.get("code") ?? "",
      code_verifier: verifier,
      resource: `${server.url}api/mcp`,
    }),
  });
  expect(exchange.status).toBe(200);
  const tokens = await exchange.json();
  expect(typeof tokens.access_token).toBe("string");
  expect(
    (await call(tokens.access_token, "tools/call", { name: "forms_list", arguments: {} })).status,
  ).toBe(200);
  const forbidden = await call(tokens.access_token, "tools/call", {
    name: "form_create",
    arguments: {},
  });
  expect(forbidden.status).toBe(403);
  expect(forbidden.headers.get("www-authenticate")).toContain("forms:write");
  const grants = await (
    await fetch(`${server.url}api/auth/oauth2/get-consents`, { headers: { cookie } })
  ).json();
  const grant = grants.find((g: { clientId: string }) => g.clientId === clientId);
  expect(grant).toBeTruthy();
  expect(
    (
      await fetch(`${server.url}api/connections/${grant.id}`, {
        method: "DELETE",
        headers: { cookie, origin: server.url.origin },
      })
    ).status,
  ).toBe(204);
  expect((await call(tokens.access_token, "tools/list")).status).toBe(401);
  const refresh = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: tokens.refresh_token,
      resource: `${server.url}api/mcp`,
    }),
  });
  expect(refresh.status).toBe(400);
}, 20000);
