import { parseArgs } from "node:util";
import { idSchema } from "../packages/core/src";
import { controlHeaders, parseKeyring } from "../packages/core/src/intake";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { form: { type: "string" }, cursor: { type: "string" } },
});
const formId = idSchema.parse(values.form);
if (!process.env.INTAKE_URL || !process.env.CONTROL_KEYS)
  throw new Error("Set INTAKE_URL and CONTROL_KEYS for the restored environment");
const endpoint = new URL("/internal/recover", process.env.INTAKE_URL);
if (
  endpoint.protocol !== "https:" &&
  !(endpoint.protocol === "http:" && ["127.0.0.1", "localhost"].includes(endpoint.hostname))
)
  throw new Error("Recovery requires HTTPS, except on localhost");
const keys = parseKeyring(process.env.CONTROL_KEYS),
  keyId = process.env.ACTIVE_KEY_ID ?? "v1";
let cursor = values.cursor,
  total = 0;
do {
  const body = JSON.stringify({ formId, ...(cursor ? { cursor } : {}) });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body,
      headers: await controlHeaders("POST", endpoint.pathname, body, keys, keyId),
      redirect: "error",
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) throw new Error(`Recovery page failed (${response.status})`);
    const result = await response.json();
    if (
      !Number.isInteger(result.recovered) ||
      result.recovered < 0 ||
      result.recovered > 25 ||
      (result.cursor !== null && typeof result.cursor !== "string")
    )
      throw new Error("Invalid recovery acknowledgement");
    total += result.recovered;
    cursor = result.cursor ?? undefined;
    console.log(JSON.stringify({ recovered: total, nextCursor: cursor ?? null }));
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "recovery.incomplete",
        formId,
        resumeCursor: cursor ?? null,
        recovered: total,
      }),
    );
    throw error;
  }
} while (cursor);
