import { isIP } from "node:net";
import { S3Client } from "@aws-sdk/client-s3";
import { parseKeyring } from "@formsmith/core/intake";
import { handleGatewayRequest } from "@formsmith/dashboard/gateway";
import { handleIntakeRequest } from "@formsmith/intake/http";
import { Intake } from "@formsmith/intake/service";
import { z } from "zod";
import { staticAssets } from "./assets";
import { requestLimit } from "./limits";
import { replayQueue } from "./replay";
import { S3Store } from "./s3-store";

const schema = z.object({
  PUBLIC_ORIGIN: z.string().url(),
  API_URL: z.string().url(),
  SELFHOST_PUBLIC_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SELFHOST_INTAKE_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  SELFHOST_TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  DASHBOARD_ASSETS: z.string().default("apps/dashboard/dist"),
  FORMS_ASSETS: z.string().default("apps/forms/dist"),
  JOURNAL_S3_ENDPOINT: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  JOURNAL_S3_REGION: z.string().default("auto"),
  JOURNAL_S3_BUCKET: z.string().min(1),
  JOURNAL_S3_PREFIX: z.string().default("formsmith/"),
  JOURNAL_S3_ACCESS_KEY_ID: z.string().min(1),
  JOURNAL_S3_SECRET_ACCESS_KEY: z.string().min(1),
  JOURNAL_S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
  ADMISSION_KEYS: z.string().min(1),
  CONTROL_KEYS: z.string().min(1),
  ACTIVE_KEY_ID: z.string().default("v1"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(
    `Invalid self-host configuration: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
  );
const config = parsed.data;
if (config.SELFHOST_PUBLIC_PORT === config.SELFHOST_INTAKE_PORT)
  throw new Error("Public and private intake ports must differ");
const origin = new URL(config.PUBLIC_ORIGIN);
const client = new S3Client({
  endpoint: config.JOURNAL_S3_ENDPOINT,
  region: config.JOURNAL_S3_REGION,
  forcePathStyle: config.JOURNAL_S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: config.JOURNAL_S3_ACCESS_KEY_ID,
    secretAccessKey: config.JOURNAL_S3_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
});
const store = new S3Store(client, config.JOURNAL_S3_BUCKET, config.JOURNAL_S3_PREFIX);
await store.verify();
const report = (event: string) => console.error(JSON.stringify({ event }));
const queue = replayQueue((key) => intake.replay(key), report);
const options = {
  admissionKeys: parseKeyring(config.ADMISSION_KEYS),
  controlKeys: parseKeyring(config.CONTROL_KEYS),
  activeKeyId: config.ACTIVE_KEY_ID,
  apiUrl: config.API_URL,
  store,
  enqueue: queue.enqueue,
  send: (request: Request) => fetch(request),
  report,
};
const intake = new Intake(options);
const limit = requestLimit();
const http = (request: Request, ip: string) =>
  handleIntakeRequest(request, {
    intake,
    controlKeys: options.controlKeys,
    admissionKeys: options.admissionKeys,
    publicHosts: [origin.hostname, "localhost", "127.0.0.1"],
    allowedOrigins: [origin.origin],
    rateLimit: async () => limit(ip),
  });
const dashboard = staticAssets(config.DASHBOARD_ASSETS);
const forms = staticAssets(config.FORMS_ASSETS);
const publicServer = Bun.serve({
  port: config.SELFHOST_PUBLIC_PORT,
  maxRequestBodySize: 1024 * 1024,
  idleTimeout: 30,
  fetch(request, server) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    const ip =
      config.SELFHOST_TRUST_PROXY === "true" && forwarded && isIP(forwarded)
        ? forwarded
        : (server.requestIP(request)?.address ?? "unknown");
    return handleGatewayRequest(request, {
      PUBLIC_HOST: origin.hostname,
      API_URL: config.API_URL,
      JOURNAL: {
        get: async (key) => {
          const record = await store.get(key);
          return record ? { json: async () => JSON.parse(record.body) as unknown } : null;
        },
      },
      ASSETS: dashboard,
      FORMS: forms,
      INTAKE: { fetch: (incoming) => http(incoming, ip) },
    });
  },
});
// Keep this port private. Control requests still require a signed body.
const intakeServer = Bun.serve({
  port: config.SELFHOST_INTAKE_PORT,
  maxRequestBodySize: 1024 * 1024,
  idleTimeout: 30,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/internal/certificate" && request.method === "GET") {
      const hostname = url.searchParams.get("domain") ?? "";
      if (hostname === origin.hostname) return new Response(null, { status: 204 });
      try {
        await intake.domain(hostname);
        return new Response(null, { status: 204 });
      } catch {
        return new Response(null, { status: 403 });
      }
    }
    return http(request, server.requestIP(request)?.address ?? "unknown");
  },
});
let running = true;
const reconciler = (async () => {
  while (running) {
    try {
      await intake.reconcile();
    } catch {
      report("intake.reconcile_failed");
    }
    if (running) await Bun.sleep(5000);
  }
})();
async function shutdown() {
  if (!running) return;
  running = false;
  await Promise.all([publicServer.stop(), intakeServer.stop()]);
  await reconciler;
  await queue.stop();
  client.destroy();
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
console.log(JSON.stringify({ event: "selfhost.ready", port: publicServer.port }));
