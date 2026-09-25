import { z } from "zod";

export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(4096).optional(),
});
export const formListQuery = pageQuery.extend({ search: z.string().trim().max(200).optional() });

// Keep PostgreSQL's microseconds: converting the cursor through Date can skip rows.
const cursorSchema = z.object({
  scope: z.string(),
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?\+00$/),
  id: z.string().uuid(),
});
export function decodeCursor(value: string | undefined, scope: string) {
  if (!value) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(value, "base64url").toString());
  } catch {
    data = null;
  }
  return cursorSchema.extend({ scope: z.literal(scope) }).parse(data);
}
export function pageResult<T extends { id: string; cursorTime: string }>(
  rows: T[],
  limit: number,
  scope: string,
) {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items: items.map(({ cursorTime: _, ...row }) => row),
    nextCursor:
      rows.length > limit && last
        ? Buffer.from(JSON.stringify({ scope, timestamp: last.cursorTime, id: last.id })).toString(
            "base64url",
          )
        : null,
  };
}
