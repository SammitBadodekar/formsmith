import { idSchema } from "@formsmith/core";
import {
  parseKeyring,
  readBoundedBody,
  verifyAdmission,
  verifyControl,
} from "@formsmith/core/intake";
import { R2Store } from "./r2-store";
import { Intake, IntakeError, isJournalKey } from "./service";

function service(env: Env) {
  return new Intake({
    store: new R2Store(env.JOURNAL),
    enqueue: async (key) => {
      await env.REPLAY.send({ key });
    },
    send: (request) => fetch(request),
    apiUrl: env.API_URL,
    admissionKeys: parseKeyring(env.ADMISSION_KEYS),
    controlKeys: parseKeyring(env.CONTROL_KEYS),
    activeKeyId: env.ACTIVE_KEY_ID,
    report: (event, receiptId) => console.error(JSON.stringify({ event, receiptId })),
  });
}
const bearer = (request: Request) =>
  request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = new Headers({
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      vary: "Origin",
    });
    const origin = request.headers.get("origin");
    const allowed = env.ALLOWED_ORIGINS.split(",").map((value) => value.trim());
    if (origin && allowed.includes(origin)) headers.set("access-control-allow-origin", origin);
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
    try {
      const intake = service(env);
      if (origin && !allowed.includes(origin)) {
        const source = new URL(origin);
        if (source.protocol !== "https:" || source.port)
          return json({ error: "Origin not allowed" }, 403);
        try {
          await intake.domain(source.hostname);
          headers.set("access-control-allow-origin", origin);
        } catch {
          return json({ error: "Origin not allowed" }, 403);
        }
      }
      if (request.method === "OPTIONS") {
        headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
        headers.set("access-control-allow-headers", "Content-Type, Authorization");
        headers.set("access-control-max-age", "600");
        return new Response(null, { status: 204, headers });
      }
      if (url.pathname === "/health" && request.method === "GET") return json({ status: "ok" });
      if (url.pathname.startsWith("/internal/")) {
        const body = await readBoundedBody(request.body);
        if (!(await verifyControl(request, body, parseKeyring(env.CONTROL_KEYS))))
          return json({ error: "Invalid service signature" }, 401);
        if (url.pathname === "/internal/publish" && request.method === "POST")
          return json(await intake.publish(JSON.parse(body)));
        if (url.pathname === "/internal/domain" && request.method === "POST")
          return json(await intake.publishDomain(JSON.parse(body)));
        if (url.pathname === "/internal/upload" && request.method === "POST")
          return json(await intake.finalizeUpload(JSON.parse(body)));
        if (url.pathname === "/internal/retry" && request.method === "POST") {
          const input: unknown = JSON.parse(body);
          if (
            typeof input !== "object" ||
            input === null ||
            !("key" in input) ||
            !isJournalKey(input.key)
          )
            throw new IntakeError(400, "Invalid journal key");
          await intake.retry(input.key);
          return json({ queued: true });
        }
        return json({ error: "Route not found" }, 404);
      }
      const custom = !env.PUBLIC_HOSTS.split(",").includes(url.hostname)
        ? await intake.domain(url.hostname)
        : null;
      if (custom && !url.pathname.startsWith("/forms/") && url.pathname !== "/domain/attempts") {
        const admission = await verifyAdmission(bearer(request), parseKeyring(env.ADMISSION_KEYS));
        if (!admission || !custom.formIds.includes(admission.formId))
          return json({ error: "Form not found on this domain" }, 404);
      }
      // Abuse mitigation, not a global billing quota or correctness lock.
      const ip = request.headers.get("cf-connecting-ip") ?? "local";
      if (!(await env.PUBLIC_RATE_LIMIT.limit({ key: ip })).success) {
        headers.set("retry-after", "60");
        return json({ error: "Too many requests. Please retry shortly." }, 429);
      }
      const start = /^\/forms\/([^/]+)\/attempts$/.exec(url.pathname);
      if (start && request.method === "POST") {
        if (custom && !custom.formIds.includes(start[1] ?? ""))
          return json({ error: "Form not found on this domain" }, 404);
        return json(await intake.start(idSchema.parse(start[1])), 201);
      }
      if (url.pathname === "/domain/attempts" && request.method === "POST") {
        if (!custom?.defaultFormId) return json({ error: "No default form on this domain" }, 404);
        return json(await intake.start(custom.defaultFormId), 201);
      }
      if (url.pathname === "/attempt" && request.method === "GET")
        return json(await intake.resume(bearer(request)));
      if (url.pathname === "/receipt" && request.method === "GET")
        return json(await intake.status(bearer(request)));
      if (url.pathname === "/submissions" && request.method === "POST") {
        const receipt = await intake.submit(
          bearer(request),
          JSON.parse(await readBoundedBody(request.body)),
        );
        return json(receipt, receipt.status === "committed" ? 200 : 202);
      }
      return json({ error: "Route not found" }, 404);
    } catch (error) {
      if (error instanceof IntakeError)
        return json({ error: error.message, details: error.details }, error.status);
      if (error instanceof RangeError) return json({ error: "Request exceeds size limit" }, 413);
      if (error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError"))
        return json({ error: "Invalid request" }, 400);
      console.error(JSON.stringify({ event: "intake.request_failed" }));
      headers.set("retry-after", "5");
      return json({ error: "Outcome unavailable. Retry with the same attempt and answers." }, 503);
    }
  },
  async queue(batch, env) {
    const intake = service(env);
    await Promise.all(
      batch.messages.map(async (message) => {
        const body = message.body;
        if (
          typeof body !== "object" ||
          body === null ||
          !("key" in body) ||
          !isJournalKey(body.key)
        ) {
          console.error(JSON.stringify({ event: "intake.invalid_queue_message" }));
          message.ack();
          return;
        }
        try {
          await intake.replay(body.key);
          message.ack();
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "intake.replay_retry",
              attempts: message.attempts,
              reason: error instanceof Error ? error.message : "unknown",
            }),
          );
          message.retry({ delaySeconds: Math.min(3600, 5 * 2 ** Math.min(message.attempts, 10)) });
        }
      }),
    );
  },
  async scheduled(_controller, env) {
    await service(env).reconcile();
  },
} satisfies ExportedHandler<Env, unknown>;
