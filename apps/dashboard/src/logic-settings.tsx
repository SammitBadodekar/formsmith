import {
  allBlocks,
  type Condition,
  type Expression,
  type FormDefinition,
  newId,
  pagesOf,
  plainText,
  questions,
  type Rule,
  validateDefinition,
} from "@formsmith/core";

type Choice = { id: string; label: string };
function Select({
  value,
  choices,
  label,
  onChange,
}: {
  value: string;
  choices: Choice[];
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {!choices.some((choice) => choice.id === value) && (
        <option value={value}>Missing reference: {value}</option>
      )}
      {choices.map((choice) => (
        <option key={choice.id} value={choice.id}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}
function ConditionInput({
  condition,
  form,
  fields,
  onChange,
  depth = 0,
}: {
  condition: Condition;
  form: FormDefinition;
  fields: Choice[];
  onChange: (condition: Condition) => void;
  depth?: number;
}) {
  if ("conditions" in condition)
    return (
      <fieldset className="condition-group">
        <legend>
          Match{" "}
          <select
            aria-label="Condition group mode"
            value={condition.mode}
            onChange={(e) =>
              onChange({ ...condition, mode: e.target.value === "all" ? "all" : "any" })
            }
          >
            <option value="all">all conditions</option>
            <option value="any">any condition</option>
          </select>
        </legend>
        {condition.conditions.map((child, index) => (
          <div
            className="condition-entry"
            // Conditions have no persisted IDs. Index preserves the position of each predicate editor.
            // biome-ignore lint/suspicious/noArrayIndexKey: Condition positions are the schema's identity within their group.
            key={index}
          >
            <ConditionInput
              condition={child}
              form={form}
              fields={fields}
              depth={depth + 1}
              onChange={(next) =>
                onChange({
                  ...condition,
                  conditions: condition.conditions.map((item, i) => (i === index ? next : item)),
                })
              }
            />
            <button
              type="button"
              className="button subtle"
              aria-label="Remove condition"
              disabled={condition.conditions.length <= 1}
              onClick={() =>
                onChange({
                  ...condition,
                  conditions: condition.conditions.filter((_, i) => i !== index),
                })
              }
            >
              ×
            </button>
          </div>
        ))}
        <div className="action-row">
          <button
            type="button"
            className="button"
            disabled={condition.conditions.length >= 50 || !fields.length}
            onClick={() =>
              onChange({
                ...condition,
                conditions: [
                  ...condition.conditions,
                  { fieldId: fields[0]?.id ?? "", op: "answered" },
                ],
              })
            }
          >
            Add condition
          </button>
          <button
            type="button"
            className="button"
            disabled={depth >= 7 || condition.conditions.length >= 50 || !fields.length}
            onClick={() =>
              onChange({
                ...condition,
                conditions: [
                  ...condition.conditions,
                  { mode: "any", conditions: [{ fieldId: fields[0]?.id ?? "", op: "answered" }] },
                ],
              })
            }
          >
            Add group
          </button>
        </div>
      </fieldset>
    );
  const question = questions(form).find((q) => q.id === condition.fieldId);
  const isChoice =
    question &&
    ["multiple_choice", "dropdown", "checkboxes", "multi_select", "ranking"].includes(
      question.type,
    );
  return (
    <div className="condition-predicate">
      <Select
        label="Condition field"
        value={condition.fieldId}
        choices={fields}
        onChange={(fieldId) => onChange({ fieldId, op: "answered" })}
      />
      <select
        aria-label="Comparison"
        value={condition.op}
        onChange={(e) =>
          onChange({
            ...condition,
            op: e.target.value as typeof condition.op,
            value: condition.value ?? "",
          })
        }
      >
        <option value="answered">is answered</option>
        <option value="eq">equals</option>
        <option value="neq">does not equal</option>
        <option value="contains">contains</option>
        <option value="gt">is greater than</option>
        <option value="lt">is less than</option>
      </select>
      {condition.op !== "answered" &&
        (isChoice ? (
          <select
            aria-label="Comparison answer"
            value={String(condition.value ?? "")}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
          >
            <option value="">Select an answer</option>
            {question.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        ) : question?.type === "consent" ? (
          <select
            aria-label="Comparison answer"
            value={String(condition.value ?? "")}
            onChange={(e) => onChange({ ...condition, value: e.target.value === "true" })}
          >
            <option value="">Select an answer</option>
            <option value="true">Agreed</option>
            <option value="false">Not agreed</option>
          </select>
        ) : (
          <input
            aria-label="Comparison value"
            value={String(condition.value ?? "")}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
          />
        ))}
    </div>
  );
}

export function LogicSettings({
  form,
  onChange,
}: {
  form: FormDefinition;
  onChange: (form: FormDefinition) => void;
}) {
  const fields: Choice[] = [
    ...questions(form).map((q) => ({ id: q.id, label: plainText(q.label) || "Untitled question" })),
    ...form.hiddenFields.map((field) => ({ id: field.id, label: `Hidden: ${field.name}` })),
    ...form.calculations.map((field) => ({ id: field.id, label: `Calculated: ${field.name}` })),
  ];
  const pages = pagesOf(form).map((page, index) => ({
    id: page.id,
    label: page.ending ? `Ending ${index}` : `Page ${index + 1}`,
  }));
  const targets = [
    ...allBlocks(form)
      .filter((b) => b.kind !== "page" && b.kind !== "ending")
      .map((b) => ({
        id: b.id,
        label:
          b.kind === "question"
            ? plainText(b.label) || "Untitled question"
            : plainText(b.content).slice(0, 60) || b.kind,
      })),
    ...form.blocks.filter((b) => b.kind === "columns").map((b) => ({ id: b.id, label: "Columns" })),
  ];
  const updateRule = (id: string, changes: Partial<Rule>) =>
    onChange({
      ...form,
      rules: form.rules.map((rule) => (rule.id === id ? { ...rule, ...changes } : rule)),
    });
  const actionInput = (
    action: Rule["actions"][number],
    onAction: (action: Rule["actions"][number]) => void,
  ) => (
    <div className="logic-action">
      <select
        aria-label="Action"
        value={action.type}
        onChange={(e) => {
          const type = e.target.value as typeof action.type;
          onAction(
            type === "jump"
              ? { type, target: "start", to: pages[1]?.id ?? "start" }
              : {
                  type,
                  target:
                    type === "require"
                      ? (questions(form)[0]?.id ?? "missing")
                      : (targets[0]?.id ?? "missing"),
                },
          );
        }}
      >
        <option value="hide">Hide</option>
        <option value="show">Show</option>
        <option value="require">Require an answer to</option>
        <option value="jump" disabled={pages.length < 2}>
          Jump from page
        </option>
      </select>
      <Select
        label="Action target"
        value={action.target}
        choices={
          action.type === "jump"
            ? pages.slice(0, -1)
            : action.type === "require"
              ? fields.filter((f) => questions(form).some((q) => q.id === f.id))
              : targets
        }
        onChange={(target) => onAction({ ...action, target })}
      />
      {action.type === "jump" && (
        <Select
          label="Jump destination"
          value={action.to ?? ""}
          choices={pages.slice(pages.findIndex((p) => p.id === action.target) + 1)}
          onChange={(to) => onAction({ ...action, to })}
        />
      )}
    </div>
  );
  const issues = validateDefinition(form).filter(
    (issue) =>
      form.rules.some((rule) => rule.id === issue.path) ||
      form.calculations.some((c) => c.id === issue.path) ||
      form.hiddenFields.some((h) => h.id === issue.path) ||
      issue.message.includes("Circular"),
  );
  return (
    <div className="logic-settings">
      <p>
        Rules run in order. Hidden and skipped answers are excluded from calculations and
        submissions.
      </p>
      {issues.length > 0 && (
        <div role="alert" className="error">
          <strong>Fix before publishing</strong>
          <ul>
            {issues.map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                {issue.message} <small>({issue.path})</small>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3>Conditional logic</h3>
      {form.rules.map((rule, index) => (
        <section className="access-card" key={rule.id}>
          <header className="logic-rule-header">
            <strong>Rule {index + 1}</strong>
            <button
              type="button"
              className="button subtle"
              onClick={() =>
                onChange({ ...form, rules: form.rules.filter((r) => r.id !== rule.id) })
              }
            >
              Delete rule
            </button>
          </header>
          <ConditionInput
            condition={
              "conditions" in rule.when ? rule.when : { mode: "all", conditions: [rule.when] }
            }
            form={form}
            fields={fields}
            onChange={(when) => updateRule(rule.id, { when })}
          />
          <p>Then</p>
          {rule.actions.map((action, i) => (
            <div
              className="condition-entry"
              // biome-ignore lint/suspicious/noArrayIndexKey: Actions have ordered positions, not persisted IDs.
              key={i}
            >
              {actionInput(action, (next) =>
                updateRule(rule.id, { actions: rule.actions.map((a, j) => (i === j ? next : a)) }),
              )}
              <button
                type="button"
                className="button subtle"
                aria-label="Remove action"
                disabled={rule.actions.length <= 1}
                onClick={() =>
                  updateRule(rule.id, { actions: rule.actions.filter((_, j) => j !== i) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button"
            disabled={rule.actions.length >= 100 || !targets.length}
            onClick={() =>
              updateRule(rule.id, {
                actions: [...rule.actions, { type: "hide", target: targets[0]?.id ?? "missing" }],
              })
            }
          >
            Add action
          </button>
          {rule.actions.some((a) => a.type === "show") && (
            <p>
              To show a question only when this rule matches, mark it hidden in its question
              settings.
            </p>
          )}
        </section>
      ))}
      <button
        type="button"
        className="button"
        disabled={!fields.length || !targets.length || form.rules.length >= 500}
        onClick={() =>
          onChange({
            ...form,
            rules: [
              ...form.rules,
              {
                id: newId(),
                when: {
                  mode: "all",
                  conditions: [{ fieldId: fields[0]?.id ?? "missing", op: "answered" }],
                },
                actions: [
                  {
                    type: "hide",
                    target:
                      targets.find((target) => target.id !== fields[0]?.id)?.id ??
                      targets[0]?.id ??
                      "missing",
                  },
                ],
              },
            ],
          })
        }
      >
        Add rule
      </button>
      <h3>Calculations</h3>
      {form.calculations.map((calculation) => (
        <section className="access-card" key={calculation.id}>
          <label>
            Name
            <input
              value={calculation.name}
              maxLength={200}
              onChange={(e) =>
                onChange({
                  ...form,
                  calculations: form.calculations.map((c) =>
                    c.id === calculation.id ? { ...c, name: e.target.value } : c,
                  ),
                })
              }
            />
          </label>
          <ExpressionInput
            expression={calculation.expression}
            fields={fields.filter((field) => field.id !== calculation.id)}
            onChange={(expression) =>
              onChange({
                ...form,
                calculations: form.calculations.map((c) =>
                  c.id === calculation.id ? { ...c, expression } : c,
                ),
              })
            }
          />
          <button
            type="button"
            className="button subtle"
            onClick={() =>
              onChange({
                ...form,
                calculations: form.calculations.filter((c) => c.id !== calculation.id),
              })
            }
          >
            Delete calculation
          </button>
        </section>
      ))}
      <button
        type="button"
        className="button"
        disabled={form.calculations.length >= 200}
        onClick={() =>
          onChange({
            ...form,
            calculations: [
              ...form.calculations,
              {
                id: newId(),
                name: `Calculation ${form.calculations.length + 1}`,
                expression: { op: "add", args: [{ literal: 0 }] },
              },
            ],
          })
        }
      >
        Add calculation
      </button>
      <h3>Hidden fields</h3>
      <p>
        Capture values from the form URL, such as <code>?source=newsletter</code>. Respondents can
        change URL values; use them for context, not trusted identity.
      </p>
      {form.hiddenFields.map((field) => (
        <div className="condition-entry" key={field.id}>
          <label>
            URL parameter
            <input
              value={field.name}
              maxLength={100}
              onChange={(e) =>
                onChange({
                  ...form,
                  hiddenFields: form.hiddenFields.map((h) =>
                    h.id === field.id ? { ...h, name: e.target.value } : h,
                  ),
                })
              }
            />
          </label>
          <button
            type="button"
            className="button subtle"
            onClick={() =>
              onChange({
                ...form,
                hiddenFields: form.hiddenFields.filter((h) => h.id !== field.id),
              })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button"
        disabled={form.hiddenFields.length >= 50}
        onClick={() =>
          onChange({
            ...form,
            hiddenFields: [
              ...form.hiddenFields,
              { id: newId(), name: `field_${form.hiddenFields.length + 1}` },
            ],
          })
        }
      >
        Add hidden field
      </button>
    </div>
  );
}

function ExpressionInput({
  expression,
  fields,
  onChange,
}: {
  expression: Expression;
  fields: Choice[];
  onChange: (expression: Expression) => void;
}) {
  const update = (index: number, arg: Expression["args"][number]) =>
    onChange({ ...expression, args: expression.args.map((a, i) => (i === index ? arg : a)) });
  return (
    <div className="expression-input">
      <label>
        Operation
        <select
          value={expression.op}
          onChange={(e) => onChange({ ...expression, op: e.target.value as Expression["op"] })}
        >
          <option value="add">Add</option>
          <option value="subtract">Subtract in order</option>
          <option value="multiply">Multiply</option>
          <option value="divide">Divide in order</option>
          <option value="concat">Join text</option>
        </select>
      </label>
      {expression.args.map((arg, index) => (
        <div
          className="condition-entry"
          // biome-ignore lint/suspicious/noArrayIndexKey: Expression operands have ordered positions, not persisted IDs.
          key={index}
        >
          <select
            aria-label="Value source"
            value={"fieldId" in arg ? "field" : typeof arg.literal}
            onChange={(e) =>
              update(
                index,
                e.target.value === "field"
                  ? { fieldId: fields[0]?.id ?? "missing" }
                  : { literal: e.target.value === "number" ? 0 : "" },
              )
            }
          >
            <option value="field" disabled={!fields.length}>
              Answer or calculation
            </option>
            <option value="number">Number</option>
            <option value="string">Text</option>
          </select>
          {"fieldId" in arg ? (
            <Select
              label="Calculation input"
              value={arg.fieldId}
              choices={fields}
              onChange={(fieldId) => update(index, { fieldId })}
            />
          ) : (
            <input
              aria-label="Literal value"
              type={typeof arg.literal === "number" ? "number" : "text"}
              value={arg.literal}
              onChange={(e) =>
                update(index, {
                  literal:
                    typeof arg.literal === "number" ? Number(e.target.value) : e.target.value,
                })
              }
            />
          )}
          <button
            type="button"
            className="button subtle"
            aria-label="Remove calculation input"
            disabled={expression.args.length <= 1}
            onClick={() =>
              onChange({ ...expression, args: expression.args.filter((_, i) => i !== index) })
            }
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button"
        disabled={expression.args.length >= 50}
        onClick={() =>
          onChange({
            ...expression,
            args: [...expression.args, { literal: expression.op === "concat" ? "" : 0 }],
          })
        }
      >
        Add input
      </button>
    </div>
  );
}
