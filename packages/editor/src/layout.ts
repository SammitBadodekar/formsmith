import { type ColumnsBlock, type FormDefinition, newId } from "@formsmith/core";

export function columnCount(block: ColumnsBlock, count: number): ColumnsBlock {
  if (![2, 3, 4].includes(count)) throw new Error("Choose two to four columns");
  const columns = block.columns
    .slice(0, count)
    .map((column) => ({ ...column, width: 100 / count }));
  // Reducing the layout must preserve every question and its references.
  const last = columns.at(-1);
  if (last)
    last.blocks = [
      ...last.blocks,
      ...block.columns.slice(count).flatMap((column) => column.blocks),
    ];
  while (columns.length < count) columns.push({ id: newId(), width: 100 / count, blocks: [] });
  return { ...block, columns };
}

export function moveToColumn(
  form: FormDefinition,
  blockId: string,
  columnId: string | null,
): FormDefinition {
  const block = form.blocks
    .flatMap((b) => (b.kind === "columns" ? [b, ...b.columns.flatMap((c) => c.blocks)] : [b]))
    .find((b) => b.id === blockId);
  if (!block) return form;
  if (columnId && (block.kind === "columns" || block.kind === "page" || block.kind === "ending"))
    return form;
  if (
    columnId &&
    !form.blocks.some((b) => b.kind === "columns" && b.columns.some((c) => c.id === columnId))
  )
    return form;
  const blocks = form.blocks
    .filter((b) => b.id !== blockId)
    .map((b) =>
      b.kind === "columns"
        ? {
            ...b,
            columns: b.columns.map((c) => ({
              ...c,
              blocks: c.blocks.filter((child) => child.id !== blockId),
            })),
          }
        : b,
    );
  if (columnId && block.kind !== "columns") {
    for (const b of blocks)
      if (b.kind === "columns") {
        const target = b.columns.find((c) => c.id === columnId);
        if (target) target.blocks = [...target.blocks, block];
      }
  } else blocks.push(block);
  return { ...form, blocks };
}
