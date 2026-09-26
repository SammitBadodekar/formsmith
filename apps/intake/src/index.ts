import { parseKeyring } from "@formsmith/core/intake";
import { handleIntakeRequest } from "./http";
import { R2Store } from "./r2-store";
import { Intake, type IntakeOptions, isJournalKey } from "./service";

function service(env: Env, defer?: IntakeOptions["defer"]) {
  return new Intake({
    store: new R2Store(env.JOURNAL),
    enqueue: async (key) => {
      await env.REPLAY.send({ key });
    },
    defer,
    send: (request) => fetch(request),
    apiUrl: env.API_URL,
    admissionKeys: parseKeyring(env.ADMISSION_KEYS),
    controlKeys: parseKeyring(env.CONTROL_KEYS),
    activeKeyId: env.ACTIVE_KEY_ID,
    report: (event, receiptId) => console.error(JSON.stringify({ event, receiptId })),
  });
}

export default {
  async fetch(request, env, ctx) {
    return handleIntakeRequest(request, {
      intake: service(env, (work) => ctx.waitUntil(work)),
      controlKeys: parseKeyring(env.CONTROL_KEYS),
      admissionKeys: parseKeyring(env.ADMISSION_KEYS),
      allowedOrigins: env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()),
      publicHosts: env.PUBLIC_HOSTS.split(","),
      rateLimit: async (incoming) =>
        (
          await env.PUBLIC_RATE_LIMIT.limit({
            key: incoming.headers.get("cf-connecting-ip") ?? "local",
          })
        ).success,
    });
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
