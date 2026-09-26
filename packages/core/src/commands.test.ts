import { expect, test } from "bun:test";
import { applyOperations } from "./commands";
import { createForm, createQuestion, newId, text } from "./model";

test("agent operations move whole questions into columns and reject invalid atomic batches", () => {
  const form = createForm();
  const question = { ...createQuestion("email"), label: text("Email"), description: text("Help") };
  const columnId = newId();
  form.blocks = [
    question,
    {
      kind: "columns",
      id: newId(),
      columns: [
        { id: columnId, width: 50, blocks: [] },
        { id: newId(), width: 50, blocks: [] },
      ],
    },
  ];
  const moved = applyOperations(form, [{ type: "move", id: question.id, columnId }]);
  const layout = moved.blocks[0];
  expect(layout?.kind).toBe("columns");
  if (layout?.kind !== "columns") throw new Error("Missing layout");
  expect(layout.columns[0]?.blocks).toEqual([question]);
  expect(form.blocks[0]).toEqual(question);
  const copied = applyOperations(moved, [{ type: "duplicate", id: question.id }]);
  const copyLayout = copied.blocks[0];
  if (copyLayout?.kind !== "columns") throw new Error("Missing layout");
  expect(copyLayout.columns[0]?.blocks).toHaveLength(2);
  expect(copyLayout.columns[0]?.blocks[1]?.id).not.toBe(question.id);
  expect(() =>
    applyOperations(form, [
      { type: "delete", id: question.id },
      { type: "move", id: layout.id, columnId },
    ]),
  ).toThrow("cannot contain");
  expect(form.blocks[0]).toEqual(question);
  expect(() =>
    applyOperations(form, [{ type: "update", id: question.id, changes: { id: newId() } }]),
  ).toThrow("identity");
});
