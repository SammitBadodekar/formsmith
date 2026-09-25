import { type Answers, csvCell } from "@formsmith/core";
import type { Database } from "./db";
import { repository, ServiceError } from "./repository";

type ExportRow = {
  id: string;
  versionId: string;
  receivedAt: string;
  committedAt: string;
  answers: Answers;
};

export function responseExports(
  db: Database,
  options: { concurrency?: number; timeoutMs?: number } = {},
) {
  let active = 0;
  return async (ownerId: string, formId: string, format: "json" | "csv", signal: AbortSignal) => {
    await repository(db).owned(ownerId, formId);
    if (active >= (options.concurrency ?? 2))
      throw new ServiceError(429, "Exports are busy. Try again shortly.");
    signal.throwIfAborted();
    active++;
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();
    void writer.closed.catch(() => {});
    const encoder = new TextEncoder();
    const deadline = AbortSignal.timeout(options.timeoutMs ?? 120_000);
    const stop = AbortSignal.any([signal, deadline]);
    const abort = () => {
      void writer.abort(stop.reason).catch(() => {});
    };
    stop.addEventListener("abort", abort, { once: true });
    let resolveReady!: () => void;
    let rejectReady!: (reason: unknown) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const write = async (text: string) => {
      stop.throwIfAborted();
      await writer.write(encoder.encode(text));
    };
    // One MVCC snapshot covers both the columns and the cursor. Backpressure bounds memory;
    // disconnects/deadlines reject pending writes and roll the transaction back.
    void db.$client
      .begin("isolation level repeatable read read only", async (tx) => {
        await tx`SET LOCAL idle_in_transaction_session_timeout = '125s'`;
        await tx`SELECT pg_current_snapshot()`;
        const columns =
          format === "csv"
            ? await tx<
                { key: string }[]
              >`SELECT DISTINCT jsonb_object_keys(answers) AS key FROM submissions WHERE form_id = ${formId}::uuid ORDER BY key LIMIT 2001`
            : [];
        if (columns.length > 2000)
          throw new ServiceError(
            422,
            "This form has too many historical fields for CSV. Export JSON instead.",
          );
        stop.throwIfAborted();
        resolveReady();
        await write(
          format === "csv"
            ? `${["id", "version", "receivedAt", ...columns.map(({ key }) => key)]
                .map(csvCell)
                .join(",")}\r\n`
            : "[",
        );
        let first = true;
        const query = tx<
          ExportRow[]
        >`SELECT id, version_id AS "versionId", to_char(received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "receivedAt", to_char(committed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "committedAt", answers FROM submissions WHERE form_id = ${formId}::uuid ORDER BY committed_at DESC, id DESC`;
        for await (const batch of query.cursor(32)) {
          let chunk = "";
          for (const row of batch) {
            if (format === "csv")
              chunk += `${[
                row.id,
                row.versionId,
                row.receivedAt,
                ...columns.map(({ key }) => row.answers[key] ?? ""),
              ]
                .map(csvCell)
                .join(",")}\r\n`;
            else {
              chunk += (first ? "" : ",") + JSON.stringify(row);
              first = false;
            }
          }
          await write(chunk);
        }
        if (format === "json") await write("]");
      })
      .then(async () => {
        await writer.close();
      })
      .catch(async (error: unknown) => {
        rejectReady(error);
        await writer.abort(error).catch(() => {});
      })
      .finally(() => {
        stop.removeEventListener("abort", abort);
        active--;
      });
    await ready;
    return new Response(stream.readable, {
      headers: {
        "content-type":
          format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="responses-${formId}.${format}"`,
        "cache-control": "no-store",
      },
    });
  };
}
