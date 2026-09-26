import { z } from "zod";
import type { Config } from "./config";

const providerSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  status: z.string().optional(),
  ownership_verification: z
    .object({
      name: z.string().optional(),
      type: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
  ssl: z
    .object({
      status: z.string().optional(),
      validation_records: z
        .array(
          z.object({
            txt_name: z.string().optional(),
            txt_value: z.string().optional(),
            cname: z.string().optional(),
            cname_target: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});
export type ProviderDomain = z.infer<typeof providerSchema>;
export function cloudflareDomains(
  config: Pick<Config, "CLOUDFLARE_ZONE_ID" | "CLOUDFLARE_API_TOKEN" | "CLOUDFLARE_GATEWAY_WORKER">,
  transport: (url: string, init: RequestInit) => Promise<Response> = fetch,
) {
  async function call(path: string, method = "GET", body?: unknown, resource = "custom_hostnames") {
    if (!config.CLOUDFLARE_ZONE_ID || !config.CLOUDFLARE_API_TOKEN)
      throw new Error("Cloudflare custom domain provisioning is not configured");
    const response = await transport(
      `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(config.CLOUDFLARE_ZONE_ID)}/${resource}${path}`,
      {
        method,
        headers: {
          authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`,
          "content-type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (response.status === 404 && method === "DELETE") return null;
    const result = (await response.json()) as { success: boolean; result: unknown };
    if (!response.ok || !result.success)
      throw new Error(`Cloudflare domain request failed (${response.status})`);
    return result.result;
  }
  async function route(hostname: string) {
    const routes = z
      .array(
        z.object({ id: z.string(), pattern: z.string(), script: z.string().nullable().optional() }),
      )
      .parse(await call("", "GET", undefined, "workers/routes"));
    return routes.find((r) => r.pattern === `${hostname}/*`);
  }
  return {
    async ensureRoute(hostname: string) {
      const existing = await route(hostname);
      if (existing && existing.script !== config.CLOUDFLARE_GATEWAY_WORKER)
        throw new Error("This hostname already has a different Cloudflare Worker route");
      if (!existing)
        await call(
          "",
          "POST",
          { pattern: `${hostname}/*`, script: config.CLOUDFLARE_GATEWAY_WORKER },
          "workers/routes",
        );
    },
    async removeRoute(hostname: string) {
      const existing = await route(hostname);
      if (existing?.script === config.CLOUDFLARE_GATEWAY_WORKER)
        await call(`/${encodeURIComponent(existing.id)}`, "DELETE", undefined, "workers/routes");
    },
    async find(hostname: string) {
      const found = z
        .array(providerSchema)
        .parse(await call(`?hostname=${encodeURIComponent(hostname)}`));
      return found.find((domain) => domain.hostname === hostname) ?? null;
    },
    async ensure(hostname: string, id?: string | null) {
      if (id) return providerSchema.parse(await call(`/${encodeURIComponent(id)}`));
      // Reconcile a create whose response was lost before issuing another create.
      const found = z
        .array(providerSchema)
        .parse(await call(`?hostname=${encodeURIComponent(hostname)}`));
      const existing = found.find((domain) => domain.hostname === hostname);
      return (
        existing ??
        providerSchema.parse(
          await call("", "POST", {
            hostname,
            ssl: { method: "txt", type: "dv", settings: { min_tls_version: "1.2" } },
          }),
        )
      );
    },
    async remove(id: string) {
      await call(`/${encodeURIComponent(id)}`, "DELETE");
    },
  };
}
export function providerRecords(domain: ProviderDomain) {
  const records: { type: string; name: string; value: string }[] = [];
  const proof = domain.ownership_verification;
  if (proof?.name && proof.value)
    records.push({ type: "TXT", name: proof.name, value: proof.value });
  for (const record of domain.ssl?.validation_records ?? []) {
    if (record.txt_name && record.txt_value)
      records.push({ type: "TXT", name: record.txt_name, value: record.txt_value });
    if (record.cname && record.cname_target)
      records.push({ type: "CNAME", name: record.cname, value: record.cname_target });
  }
  return records;
}
