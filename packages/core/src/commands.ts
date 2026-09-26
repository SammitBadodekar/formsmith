import { z } from "zod";
import { type Block, blockSchema, type FormDefinition, formSchema, idSchema, newId } from "./model";
export const formOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("insert"),
    block: blockSchema,
    afterId: idSchema.optional(),
    columnId: idSchema.optional(),
  }),
  z.object({ type: z.literal("update"), id: idSchema, changes: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("delete"), id: idSchema }),
  z.object({
    type: z.literal("move"),
    id: idSchema,
    afterId: idSchema.optional(),
    columnId: idSchema.optional(),
  }),
  z.object({ type: z.literal("duplicate"), id: idSchema }),
]);
export type FormOperation = z.infer<typeof formOperationSchema>;
export function applyOperations(
  definition: FormDefinition,
  operations: FormOperation[],
): FormDefinition {
  let form = structuredClone(definition);
  for (const op of operations) {
    const destination = (columnId: string | undefined, block: Block): Block[] => {
      if (!columnId) return form.blocks;
      if (["columns", "page", "ending"].includes(block.kind))
        throw new Error("Columns cannot contain layouts, pages or endings");
      const column = form.blocks
        .flatMap((b) => (b.kind === "columns" ? b.columns : []))
        .find((c) => c.id === columnId);
      if (!column) throw new Error("Column not found");
      return column.blocks;
    };
    const find = () => {
      for (const list of [
        form.blocks,
        ...form.blocks.flatMap((b) => (b.kind === "columns" ? b.columns.map((c) => c.blocks) : [])),
      ]) {
        const index = list.findIndex((b) => b.id === ("id" in op ? op.id : undefined));
        if (index >= 0) return { list, index, block: list[index] as Block };
      }
      throw new Error("Block not found");
    };
    if (op.type === "insert") {
      const target = destination(op.columnId, op.block);
      const at = op.afterId ? target.findIndex((b) => b.id === op.afterId) + 1 : target.length;
      if (op.afterId && at === 0) throw new Error("Insertion target not found");
      target.splice(at, 0, op.block);
    } else {
      const { list, index, block } = find();
      if (op.type === "delete") list.splice(index, 1);
      if (op.type === "update") {
        if ("id" in op.changes || "kind" in op.changes)
          throw new Error("Block identity cannot be changed");
        Object.assign(block, op.changes);
      }
      if (op.type === "move") {
        if (op.afterId === op.id) continue;
        const target = destination(op.columnId, block);
        list.splice(index, 1);
        const at = op.afterId ? target.findIndex((b) => b.id === op.afterId) + 1 : 0;
        if (op.afterId && at === 0) throw new Error("Move target not found");
        target.splice(at, 0, block);
      }
      if (op.type === "duplicate") {
        const clone = structuredClone(block);
        clone.id = newId();
        if (clone.kind === "columns")
          for (const c of clone.columns) {
            c.id = newId();
            for (const b of c.blocks) b.id = newId();
          }
        if (clone.kind === "columns") form.blocks.splice(form.blocks.indexOf(block) + 1, 0, clone);
        else list.splice(index + 1, 0, clone);
      }
    }
  }
  form = formSchema.parse(form);
  return form;
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export async function hashPayload(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(value)),
  );
  return Array.from(new Uint8Array(hash), (v) => v.toString(16).padStart(2, "0")).join("");
}
export function csvCell(value: unknown) {
  let text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
