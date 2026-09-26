import { defineRailway, preserve, project, service } from "railway/iac";

// Keep database, volume and bucket lifecycle outside this application's deployments.
export const partial = "formsmith-application";

const variables = Object.fromEntries(
  [
    "ACTIVE_KEY_ID",
    "ADMISSION_KEYS",
    "BETTER_AUTH_SECRET",
    "CLOUDFLARE_ZONE_ID",
    "CONTROL_KEYS",
    "CUSTOM_DOMAIN_TARGET",
    "DATABASE_URL",
    "DB_POOL_SIZE",
    "ENCRYPTION_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "INTAKE_URL",
    "PORT",
    "PROCESS_ROLE",
    "PUBLIC_ORIGIN",
    "S3_ACCESS_KEY_ID",
    "S3_BUCKET",
    "S3_ENDPOINT",
    "S3_FORCE_PATH_STYLE",
    "S3_REGION",
    "S3_SECRET_ACCESS_KEY",
  ].map((name) => [name, preserve()]),
);

export default defineRailway(() => {
  const common = {
    build: { builder: "DOCKERFILE" as const, dockerfilePath: "Dockerfile" },
    env: variables,
    deploy: {
      // Railway's default is ON_FAILURE with 10 restarts; its API normalizes
      // those defaults to null, so spelling them out creates perpetual drift.
      drainingSeconds: 30,
      overlapSeconds: 30,
    },
  };
  const api = service("formsmith-api", {
    ...common,
    replicas: { "europe-west4-drams3a": 2 },
    healthcheck: "/ready",
    healthcheckTimeout: 120,
  });
  const worker = service("formsmith-worker", {
    ...common,
    replicas: { "europe-west4-drams3a": 1 },
  });
  return project("formsmith", { resources: [api, worker] });
});
