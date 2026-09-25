import assert from "node:assert/strict";
import { cpus } from "node:os";
import {
  type Answers,
  createForm,
  createQuestion,
  evaluate,
  formSchema,
  newId,
  text,
  validateAnswers,
  validateDefinition,
} from "../packages/core/src";
import { closeHistory, history } from "../packages/editor/node_modules/prosemirror-history";
import { EditorState } from "../packages/editor/node_modules/prosemirror-state";
import { documentToForm, formToDocument, stableIdentity } from "../packages/editor/src/document";

const form = createForm();
form.title = "200-question benchmark";
const answers: Answers = {};
for (let i = 0; i < 200; i++) {
  const question = {
    ...createQuestion(i % 2 ? "number" : "short_text"),
    label: text(`Question ${i + 1}`),
    description: text("A realistic question with supporting help text."),
    required: true,
  };
  form.blocks.push(question);
  answers[question.id] = i % 2 ? i : "An example response";
  if (i > 0 && i % 5 === 0) {
    const previous = form.blocks[i - 1];
    if (!previous) throw new Error("Missing previous question");
    form.rules.push({
      id: newId(),
      when: { fieldId: previous.id, op: "answered" },
      actions: [{ type: "show", target: question.id }],
    });
  }
}
assert.deepEqual(validateDefinition(form), []);
assert.equal(validateAnswers(form, answers).valid, true);
let state = EditorState.create({ doc: formToDocument(form), plugins: [history(), stableIdentity] });
const firstPosition = state.doc.child(0).nodeSize + 2;
function measure(name: string, run: () => void, iterations = 1000) {
  for (let i = 0; i < 100; i++) run();
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const percentile = (fraction: number) =>
    Number(
      (samples[Math.min(samples.length - 1, Math.floor(samples.length * fraction))] ?? 0).toFixed(
        3,
      ),
    );
  return {
    name,
    iterations,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
  };
}
const results = [
  measure("parse definition", () => {
    formSchema.parse(form);
  }),
  measure("evaluate logic", () => {
    evaluate(form, answers);
  }),
  measure("validate submission", () => {
    validateAnswers(form, answers);
  }),
  measure("editor typing + serialize", () => {
    state = state.applyTransaction(state.tr.insertText("x", firstPosition)).state;
    documentToForm(state.doc);
    state = state.applyTransaction(state.tr.delete(firstPosition, firstPosition + 1)).state;
  }),
  measure("editor move + serialize", () => {
    const last = state.doc.lastChild;
    if (!last) throw new Error("Missing last block");
    const end = state.doc.content.size;
    state = state.applyTransaction(
      closeHistory(state.tr)
        .delete(end - last.nodeSize, end)
        .insert(state.doc.child(0).nodeSize, last),
    ).state;
    documentToForm(state.doc);
  }),
];
console.log(
  JSON.stringify(
    {
      runtime: Bun.version,
      cpu: cpus()[0]?.model,
      questions: 200,
      rules: form.rules.length,
      definitionBytes: new TextEncoder().encode(JSON.stringify(form)).length,
      note: "Local CPU measurements; excludes browser layout, network, database and mobile devices.",
      results,
    },
    null,
    2,
  ),
);
