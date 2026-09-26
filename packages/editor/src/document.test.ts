import { expect, test } from "bun:test";
import { createForm, createQuestion, fieldKinds, formSchema, newId, text } from "@formsmith/core";
import { closeHistory, history, redo, undo } from "prosemirror-history";
import { EditorState } from "prosemirror-state";
import { blockToNode, documentToForm, formToDocument, stableIdentity } from "./document";
import { columnCount, moveToColumn } from "./layout";

test("all field kinds and rich text round-trip through the editing document", () => {
  const form = createForm();
  form.title = "Rich form";
  form.blocks = fieldKinds.map((type) => ({
    ...createQuestion(type),
    label: [{ text: type, marks: ["bold"] }],
    description: [{ text: "Help\nSecond line", href: "https://example.com" }],
  }));
  const doc = formToDocument(form);
  doc.check();
  expect(formSchema.parse(documentToForm(doc))).toEqual(formSchema.parse(form));
});
test("typing, duplicate, undo and redo preserve question identity and text", () => {
  const form = createForm(),
    question = { ...createQuestion("email"), label: text("Email") };
  form.blocks = [question];
  let state = EditorState.create({
    doc: formToDocument(form),
    plugins: [history(), stableIdentity],
  });
  const apply = (tr: Parameters<typeof state.applyTransaction>[0]) => {
    state = state.applyTransaction(tr).state;
  };
  const pos = state.doc.child(0).nodeSize;
  apply(state.tr.insertText("Your ", pos + 2));
  const original = state.doc.child(1);
  apply(closeHistory(state.tr).insert(pos + original.nodeSize, original));
  const duplicated = documentToForm(state.doc).blocks;
  expect(duplicated).toHaveLength(2);
  expect(duplicated[0]?.id).toBe(question.id);
  expect(duplicated[1]?.id).not.toBe(question.id);
  const duplicateId = duplicated[1]?.id;
  expect(undo(state, apply)).toBe(true);
  expect(documentToForm(state.doc).blocks).toHaveLength(1);
  expect(documentToForm(state.doc).blocks[0]).toMatchObject({ label: text("Your Email") });
  expect(redo(state, apply)).toBe(true);
  expect(documentToForm(state.doc).blocks[1]?.id).toBe(duplicateId);
});
test("column contents remain bounded leaves with stable identities", () => {
  const form = createForm();
  form.blocks = [
    {
      kind: "columns",
      id: newId(),
      columns: [1, 2, 3, 4].map(() => ({
        id: newId(),
        width: 25,
        blocks: [{ ...createQuestion("number"), label: text("Count") }],
      })),
    },
  ];
  const doc = formToDocument(form);
  doc.check();
  expect(documentToForm(doc)).toEqual(form);
  expect(() => blockToNode({ ...form.blocks[0], columns: [] } as never).check()).toThrow();
});
test("reducing columns and moving questions preserve answers, help and piping identities through undo", () => {
  const form = createForm();
  const questions = [1, 2, 3, 4].map((i) => ({
    ...createQuestion("email"),
    label: text(`Email ${i}`),
    description: text(`Help ${i}`),
  }));
  const layout = {
    kind: "columns" as const,
    id: newId(),
    columns: questions.map((q) => ({ id: newId(), width: 25, blocks: [q] })),
  };
  form.blocks = [layout];
  const reduced = columnCount(layout, 2);
  expect(reduced.columns.flatMap((c) => c.blocks)).toEqual(questions);
  expect(reduced.columns[1]?.blocks).toHaveLength(3);
  expect(() => columnCount(layout, 5)).toThrow();
  const question = questions[0];
  const target = layout.columns[3];
  if (!question || !target) throw new Error("Missing fixture");
  const moved = moveToColumn(form, question.id, target.id);
  const movedLayout = moved.blocks[0];
  if (movedLayout?.kind !== "columns") throw new Error("Missing layout");
  expect(movedLayout.columns[0]?.blocks).toEqual([]);
  expect(movedLayout.columns[3]?.blocks.at(-1)).toEqual(question);
  expect(form.blocks[0]).toEqual(layout);
  expect(moveToColumn(form, layout.id, target.id)).toBe(form);
  let state = EditorState.create({
    doc: formToDocument(form),
    plugins: [history(), stableIdentity],
  });
  const apply = (tr: Parameters<typeof state.applyTransaction>[0]) => {
    state = state.applyTransaction(tr).state;
  };
  apply(
    closeHistory(state.tr).replaceWith(0, state.doc.content.size, formToDocument(moved).content),
  );
  state.doc.check();
  expect(undo(state, apply)).toBe(true);
  expect(documentToForm(state.doc)).toEqual(form);
  expect(redo(state, apply)).toBe(true);
  const out = moveToColumn(documentToForm(state.doc), question.id, null);
  expect(out.blocks.at(-1)).toEqual(question);
});
