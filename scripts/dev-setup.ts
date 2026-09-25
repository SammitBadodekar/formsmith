import { chmod, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const environmentFile = Bun.file(`${root}/.env`);
const secret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
await mkdir(`${root}/.local`, { recursive: true, mode: 0o700 });
if (!(await environmentFile.exists())) {
  const password = secret();
  await Bun.write(
    environmentFile,
    [
      `DATABASE_URL=postgresql://formsmith:${password}@127.0.0.1:54329/formsmith`,
      "PUBLIC_ORIGIN=http://127.0.0.1:5173",
      "PORT=3001",
      "DB_POOL_SIZE=10",
      `BETTER_AUTH_SECRET=${secret()}`,
      "GOOGLE_CLIENT_ID=configure-google-oauth",
      "GOOGLE_CLIENT_SECRET=configure-google-oauth",
      "INTAKE_URL=http://127.0.0.1:8787",
      "ACTIVE_KEY_ID=v1",
      `CONTROL_KEYS='${JSON.stringify({ v1: secret() })}'`,
      `ADMISSION_KEYS='${JSON.stringify({ v1: secret() })}'`,
      `ENCRYPTION_KEY=${secret()}`,
      "",
    ].join("\n"),
  );
  await chmod(environmentFile.name ?? `${root}/.env`, 0o600);
}
const values: Record<string, string> = {};
for (const line of (await Bun.file(`${root}/.env`).text()).split("\n")) {
  const index = line.indexOf("=");
  if (index > 0) values[line.slice(0, index)] = line.slice(index + 1).replace(/^'(.*)'$/, "$1");
}
const devVarsPath = `${root}/apps/intake/.dev.vars`;
if (!(await Bun.file(devVarsPath).exists())) {
  if (!values.CONTROL_KEYS || !values.ADMISSION_KEYS)
    throw new Error("Add CONTROL_KEYS and ADMISSION_KEYS to .env");
  await Bun.write(
    devVarsPath,
    `CONTROL_KEYS='${values.CONTROL_KEYS}'\nADMISSION_KEYS='${values.ADMISSION_KEYS}'\nAPI_URL=http://127.0.0.1:3001\nPUBLIC_HOSTS=127.0.0.1,localhost,formsmith.samz.in\nALLOWED_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5174\n`,
  );
  await chmod(devVarsPath, 0o600);
}
if (process.argv.includes("--postgres")) {
  const databaseUrl = new URL(values.DATABASE_URL ?? "");
  if (
    databaseUrl.hostname !== "127.0.0.1" ||
    databaseUrl.port !== "54329" ||
    databaseUrl.username !== "formsmith"
  )
    throw new Error(
      "Automatic database setup is restricted to the isolated local development database",
    );
  const dataDirectory = `${root}/.local/postgres`;
  async function run(args: string[], allowedFailure = false) {
    const child = Bun.spawn(args, {
      cwd: root,
      env: { ...process.env, PGPASSWORD: decodeURIComponent(databaseUrl.password) },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, output, errors] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if (code && !allowedFailure) throw new Error(`${args[0]} failed: ${errors}`);
    return { code, output };
  }
  if (!(await Bun.file(`${dataDirectory}/PG_VERSION`).exists())) {
    const passwordFile = `${root}/.local/postgres-password`;
    await Bun.write(passwordFile, decodeURIComponent(databaseUrl.password));
    await chmod(passwordFile, 0o600);
    await run([
      "initdb",
      "-D",
      dataDirectory,
      "-U",
      "formsmith",
      "--pwfile",
      passwordFile,
      "--auth-host=scram-sha-256",
      "--auth-local=trust",
    ]);
  }
  if ((await run(["pg_ctl", "-D", dataDirectory, "status"], true)).code !== 0)
    await run([
      "pg_ctl",
      "-D",
      dataDirectory,
      "-l",
      `${root}/.local/postgres.log`,
      "-o",
      "-p 54329 -h 127.0.0.1",
      "start",
    ]);
  const psql = [
    "psql",
    "-h",
    "127.0.0.1",
    "-p",
    "54329",
    "-U",
    "formsmith",
    "-d",
    "postgres",
    "-tAc",
  ];
  if (
    !(await run([...psql, "SELECT 1 FROM pg_database WHERE datname = 'formsmith'"])).output.trim()
  )
    await run([...psql, "CREATE DATABASE formsmith"]);
}
console.log(
  "Development configuration ready. Secrets are in ignored files. Google OAuth credentials must be configured before sign-in.",
);
