import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PUBLIC_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
  INTAKE_URL: z.string().url().default("http://127.0.0.1:8787"),
  CONTROL_KEYS: z.string().min(1),
  ADMISSION_KEYS: z.string().min(1),
  S3_ENDPOINT: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ACTIVE_KEY_ID: z.string().default("v1"),
  CUSTOM_DOMAIN_TARGET: z.string().default("forms.formsmith.samz.in"),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_GATEWAY_WORKER: z.string().default("formsmith-dashboard"),
});
export function loadConfig() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      `Invalid configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  return parsed.data;
}
export type Config = ReturnType<typeof loadConfig>;
