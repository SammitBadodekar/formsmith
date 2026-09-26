import { expect, test } from "bun:test";
import { evaluate, validateAnswers, validateDefinition } from "./logic";
import { type Condition, conditionSchema, createForm, createQuestion, newId, text } from "./model";

test("hidden answers are excluded from calculations, piping values and submission", () => {
  const form = createForm(),
    gate = { ...createQuestion("number"), label: text("Show?") },
    hidden = { ...createQuestion("number"), label: text("Amount"), required: true };
  form.blocks = [gate, hidden];
  form.rules = [
    {
      id: newId(),
      when: { fieldId: gate.id, op: "eq", value: 0 },
      actions: [{ type: "hide", target: hidden.id }],
    },
  ];
  const total = {
    id: newId(),
    name: "Total",
    expression: { op: "add" as const, args: [{ fieldId: hidden.id }, { literal: 10 }] },
  };
  form.calculations = [total];
  const answers = { [gate.id]: 0, [hidden.id]: 100 };
  const checked = validateAnswers(form, answers);
  expect(checked.valid).toBe(true);
  expect(checked.answers).toEqual({ [gate.id]: 0 });
  expect(checked.state.values[total.id]).toBeUndefined();
  expect(answers[hidden.id]).toBe(100);
  expect(evaluate(form, { ...answers, [gate.id]: 1 }).values[hidden.id]).toBe(100);
});
test("hiding a column group excludes its required children", () => {
  const form = createForm(),
    gate = { ...createQuestion("number"), label: text("Gate") },
    child = { ...createQuestion("email"), label: text("Email"), required: true },
    columnsId = newId();
  form.blocks = [
    gate,
    {
      kind: "columns",
      id: columnsId,
      columns: [
        { id: newId(), width: 50, blocks: [child] },
        { id: newId(), width: 50, blocks: [] },
      ],
    },
  ];
  form.rules = [
    {
      id: newId(),
      when: { fieldId: gate.id, op: "eq", value: 0 },
      actions: [{ type: "hide", target: columnsId }],
    },
  ];
  expect(validateDefinition(form)).toEqual([]);
  const checked = validateAnswers(form, { [gate.id]: 0, [child.id]: "a@example.com" });
  expect(checked.valid).toBe(true);
  expect(checked.answers[child.id]).toBeUndefined();
  expect(checked.state.visible[child.id]).toBe(false);
});
test("skipped-page values cannot affect active calculations or piped answers", () => {
  const form = createForm(),
    gate = { ...createQuestion("number"), label: text("Route") },
    skipped = { ...createQuestion("number"), label: text("Skipped"), required: true },
    page = newId(),
    end = newId(),
    total = newId();
  form.blocks = [
    gate,
    { kind: "page", id: page, content: [] },
    skipped,
    { kind: "ending", id: end, content: text("Thanks") },
  ];
  form.rules = [
    {
      id: newId(),
      when: { fieldId: gate.id, op: "eq", value: 1 },
      actions: [{ type: "jump", target: "start", to: end }],
    },
  ];
  form.calculations = [
    {
      id: total,
      name: "Total",
      expression: { op: "add", args: [{ fieldId: skipped.id }, { literal: 5 }] },
    },
  ];
  expect(validateDefinition(form)).toEqual([]);
  const result = validateAnswers(form, { [gate.id]: 1, [skipped.id]: 20 });
  expect(result.valid).toBe(true);
  expect(result.answers).toEqual({ [gate.id]: 1 });
  expect(result.state.values[total]).toBeUndefined();
});
test("jump conditions cannot depend on later pages through calculations", () => {
  const form = createForm(),
    later = { ...createQuestion("number"), label: text("Later") },
    page = newId(),
    ending = newId(),
    calc = newId();
  form.blocks = [
    { kind: "page", id: page, content: [] },
    later,
    { kind: "ending", id: ending, content: [] },
  ];
  form.calculations = [
    { id: calc, name: "Later result", expression: { op: "add", args: [{ fieldId: later.id }] } },
  ];
  form.rules = [
    {
      id: newId(),
      when: { fieldId: calc, op: "answered" },
      actions: [{ type: "jump", target: "start", to: ending }],
    },
  ];
  expect(validateDefinition(form).some((i) => i.message.includes("earlier pages"))).toBe(true);
});
test("nested logic is bounded before recursive evaluation", () => {
  let condition: Condition = { fieldId: newId(), op: "answered" };
  for (let i = 0; i < 10; i++) condition = { mode: "all", conditions: [condition] };
  expect(conditionSchema.safeParse(condition).success).toBe(false);
});
test("dates, numeric increments, scales and rankings use the same strict server validation", () => {
  const form = createForm();
  const date = { ...createQuestion("date"), label: text("Date") };
  const amount = { ...createQuestion("number"), label: text("Amount"), min: 0.1, step: 0.1 };
  const rating = { ...createQuestion("rating"), label: text("Rating") };
  const ranking = { ...createQuestion("ranking"), label: text("Rank") };
  form.blocks = [date, amount, rating, ranking];
  const invalid = validateAnswers(form, {
    [date.id]: "2025-02-29",
    [amount.id]: 0.15,
    [rating.id]: 2.5,
    [ranking.id]: [ranking.options[0]?.id ?? ""],
  });
  expect(Object.keys(invalid.errors)).toHaveLength(4);
  expect(
    validateAnswers(form, {
      [date.id]: "2024-02-29",
      [amount.id]: 0.3,
      [rating.id]: 5,
      [ranking.id]: ranking.options.map((o) => o.id),
    }).valid,
  ).toBe(true);
});
test("drafts may have incomplete hidden parameters but publication rejects ambiguities and ending questions", () => {
  const form = createForm();
  form.hiddenFields = [
    { id: newId(), name: "source" },
    { id: newId(), name: "source" },
    { id: newId(), name: "" },
  ];
  form.blocks = [
    { kind: "ending", id: newId(), content: text("Thanks") },
    { ...createQuestion("email"), label: text("Email") },
  ];
  expect(validateDefinition(form).filter((i) => i.message.includes("URL parameter"))).toHaveLength(
    2,
  );
  expect(validateDefinition(form).some((i) => i.message.includes("Endings cannot"))).toBe(true);
});
