import { z } from "zod";
import { canonicalJson, hashPayload } from "./commands";
import { formSchema, idSchema, submissionSchema } from "./model";

export const MAX_INTAKE_BYTES = 512 * 1024;
export const MAX_POLICY_AGE_MS = 24 * 60 * 60 * 1000;
export const manifestSchema = z.object({
  revision: z.number().int().positive().safe(),
  versionId: idSchema,
  definition: formSchema,
  closed: z.boolean(),
  validUntil: z.number().int().positive().safe(),
});
export type Manifest = z.infer<typeof manifestSchema>;
export const domainManifestSchema = z.object({
  hostname: z
    .string()
    .max(253)
    .regex(/^[a-z0-9.-]+$/),
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  active: z.boolean(),
  formIds: z.array(z.string().uuid()).max(10000),
  defaultFormId: z.string().uuid().nullable(),
  validUntil: z.number().int().positive(),
});
export type DomainManifest = z.infer<typeof domainManifestSchema>;
export const admissionSchema = z.object({
  purpose: z.literal("formsmith-attempt-v1"),
  formId: idSchema,
  versionId: idSchema,
  definitionHash: z.string().regex(/^[0-9a-f]{64}$/),
  attemptId: z.string().uuid(),
  issuedAt: z.number().int().nonnegative().safe(),
  expiresAt: z.number().int().positive().safe(),
});
export type Admission = z.infer<typeof admissionSchema>;
export const uploadProofSchema = z.object({
  id: z.string().uuid(),
  formId: idSchema,
  attemptId: z.string().uuid(),
  questionId: idSchema,
  bytes: z
    .number()
    .int()
    .nonnegative()
    .max(25 * 1024 * 1024),
});
export type UploadProof = z.infer<typeof uploadProofSchema>;
export const journalEntrySchema = z.object({
  protocolVersion: z.literal(1),
  receiptId: z.string().uuid(),
  receivedAt: z.string().datetime(),
  requestHash: z.string().regex(/^[0-9a-f]{64}$/),
  definitionHash: z.string().regex(/^[0-9a-f]{64}$/),
  command: submissionSchema,
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export const commitResultSchema = z.object({
  receiptId: z.string().uuid(),
  requestHash: z.string().regex(/^[0-9a-f]{64}$/),
  submissionId: z.string().uuid(),
});
export type CommitResult = z.infer<typeof commitResultSchema>;

const encoder = new TextEncoder();
const keyringSchema = z.record(idSchema, z.string().min(43).max(256));
export function parseKeyring(serialized: string): Record<string, string> {
  return keyringSchema.parse(JSON.parse(serialized));
}
function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
}
async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function sign(value: string, secret: string): Promise<string> {
  return encode(
    new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(value))),
  );
}
async function verify(value: string, signature: string, secret: string): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      decode(signature),
      encoder.encode(value),
    );
  } catch {
    return false;
  }
}
export async function issueAdmission(
  admission: Admission,
  keys: Record<string, string>,
  keyId: string,
) {
  const secret = keys[keyId];
  if (!secret) throw new Error("Active admission key missing");
  const payload = encode(encoder.encode(JSON.stringify(admissionSchema.parse(admission))));
  const signed = `${keyId}.${payload}`;
  return `${signed}.${await sign(signed, secret)}`;
}
// Expiration is checked by intake for NEW acceptance. Existing receipt reads and
// identical retries remain possible after expiry or closure, using the same token.
export async function verifyAdmission(
  token: string,
  keys: Record<string, string>,
): Promise<Admission | null> {
  if (token.length > 4096) return null;
  const parts = token.split(".");
  const [keyId, payload, signature] = parts;
  if (parts.length !== 3 || !keyId || !payload || !signature || !Object.hasOwn(keys, keyId))
    return null;
  const secret = keys[keyId];
  if (!secret || !(await verify(`${keyId}.${payload}`, signature, secret))) return null;
  try {
    return admissionSchema.parse(JSON.parse(new TextDecoder().decode(decode(payload))));
  } catch {
    return null;
  }
}

// The body, method, path and purpose are covered, preventing a valid sync request
// from authorizing replay or another form. Short validity bounds captured requests.
export async function controlHeaders(
  method: string,
  path: string,
  body: string,
  keys: Record<string, string>,
  keyId: string,
  now = Date.now(),
) {
  const secret = keys[keyId];
  if (!secret) throw new Error("Active control key missing");
  const timestamp = String(now);
  const signed = canonicalJson([
    "formsmith-control-v1",
    method.toUpperCase(),
    path,
    timestamp,
    await hashPayload(body),
  ]);
  return {
    "content-type": "application/json",
    "x-formsmith-key": keyId,
    "x-formsmith-time": timestamp,
    "x-formsmith-signature": await sign(signed, secret),
  };
}
export async function verifyControl(
  request: Request,
  body: string,
  keys: Record<string, string>,
  now = Date.now(),
) {
  const keyId = request.headers.get("x-formsmith-key") ?? "";
  const timestamp = request.headers.get("x-formsmith-time") ?? "";
  const signature = request.headers.get("x-formsmith-signature") ?? "";
  if (
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 5 * 60 * 1000 ||
    !Object.hasOwn(keys, keyId)
  )
    return false;
  const secret = keys[keyId];
  if (!secret) return false;
  const signed = canonicalJson([
    "formsmith-control-v1",
    request.method.toUpperCase(),
    new URL(request.url).pathname,
    timestamp,
    await hashPayload(body),
  ]);
  return verify(signed, signature, secret);
}

export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes = MAX_INTAKE_BYTES,
): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RangeError("Request exceeds size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
}
