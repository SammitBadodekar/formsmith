const role = process.env.PROCESS_ROLE ?? "api";
if (!["api", "worker"].includes(role)) throw new Error("PROCESS_ROLE must be api or worker");
// Also support hosts without a pre-deploy hook. A database advisory lock makes this
// safe when replicas start together, and a failed migration never starts serving.
const migration = Bun.spawn(["bun", "migrate.js"], { stdout: "inherit", stderr: "inherit" });
if (await migration.exited) throw new Error("Database migration failed");
if (role === "api") await import("./index.js");
else if (role === "worker") await import("./worker.js");

export {};
