import {
  type Answers,
  allBlocks,
  type Condition,
  type Expression,
  type FormDefinition,
  hasAnswer,
  pagesOf,
  plainText,
  questions,
  type RichText,
  safeUrl,
} from "./model";
export type Issue = { path: string; message: string };
export function conditionRefs(c: Condition): string[] {
  return "fieldId" in c ? [c.fieldId] : c.conditions.flatMap(conditionRefs);
}
export function matches(c: Condition, values: Answers): boolean {
  if ("conditions" in c)
    return c.mode === "all"
      ? c.conditions.every((x) => matches(x, values))
      : c.conditions.some((x) => matches(x, values));
  const v = values[c.fieldId];
  switch (c.op) {
    case "answered":
      return hasAnswer(v);
    case "eq":
      return hasAnswer(v) && String(v) === String(c.value);
    case "neq":
      return hasAnswer(v) && String(v) !== String(c.value);
    case "contains":
      return Array.isArray(v)
        ? v.includes(String(c.value))
        : typeof v === "string" && v.includes(String(c.value));
    case "gt":
      return hasAnswer(v) && Number(v) > Number(c.value);
    case "lt":
      return hasAnswer(v) && Number(v) < Number(c.value);
  }
}
function calculate(e: Expression, values: Answers): string | number | undefined {
  const args = e.args.map((a) => ("fieldId" in a ? values[a.fieldId] : a.literal));
  if (args.some((a) => !hasAnswer(a))) return undefined;
  if (e.op === "concat") return args.map(String).join("");
  const nums = args.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return undefined;
  const first = nums[0] ?? 0;
  let result = first;
  for (const n of nums.slice(1)) {
    if (e.op === "add") result += n;
    if (e.op === "subtract") result -= n;
    if (e.op === "multiply") result *= n;
    if (e.op === "divide") result /= n;
  }
  return Number.isFinite(result) ? result : undefined;
}
export function dependencyOrder(form: FormDefinition): { order: string[]; cycles: string[] } {
  const deps = new Map<string, Set<string>>();
  for (const b of allBlocks(form)) deps.set(b.id, new Set());
  for (const b of form.blocks)
    if (b.kind === "columns") {
      deps.set(b.id, new Set());
      for (const c of b.columns) for (const child of c.blocks) deps.get(child.id)?.add(b.id);
    }
  deps.set("start", new Set());
  for (const h of form.hiddenFields) deps.set(h.id, new Set());
  for (const c of form.calculations)
    deps.set(c.id, new Set(c.expression.args.flatMap((a) => ("fieldId" in a ? [a.fieldId] : []))));
  for (const r of form.rules)
    for (const a of r.actions) {
      const set = deps.get(a.target);
      for (const ref of conditionRefs(r.when)) set?.add(ref);
    }
  const order: string[] = [],
    cycles: string[] = [],
    active = new Set<string>(),
    done = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      cycles.push(id);
      return;
    }
    if (done.has(id)) return;
    active.add(id);
    for (const d of deps.get(id) ?? []) visit(d);
    active.delete(id);
    done.add(id);
    order.push(id);
  };
  for (const id of deps.keys()) visit(id);
  return { order, cycles };
}
export function validateDefinition(form: FormDefinition): Issue[] {
  const issues: Issue[] = [],
    ids = new Set<string>(["start"]),
    blocks = allBlocks(form);
  const addId = (id: string) => {
    if (ids.has(id)) issues.push({ path: id, message: "IDs must be unique" });
    ids.add(id);
  };
  for (const b of form.blocks) {
    if (b.kind === "columns") {
      addId(b.id);
      for (const c of b.columns) {
        addId(c.id);
        for (const child of c.blocks)
          if (child.kind === "page" || child.kind === "ending")
            issues.push({ path: child.id, message: "Pages and endings cannot be inside columns" });
      }
    }
  }
  for (const b of blocks) addId(b.id);
  for (const c of form.calculations) addId(c.id);
  for (const h of form.hiddenFields) addId(h.id);
  const hiddenNames = new Set<string>();
  for (const h of form.hiddenFields) {
    if (!/^[a-zA-Z][\w-]{0,99}$/.test(h.name) || hiddenNames.has(h.name))
      issues.push({
        path: h.id,
        message: "Hidden fields need unique URL parameter names, starting with a letter",
      });
    hiddenNames.add(h.name);
  }
  for (const c of form.calculations)
    if (!c.name.trim()) issues.push({ path: c.id, message: "Name this calculation" });
  const values = new Set([
    ...questions(form).map((q) => q.id),
    ...form.calculations.map((c) => c.id),
    ...form.hiddenFields.map((h) => h.id),
  ]);
  const ref = (id: string, path: string) => {
    if (!values.has(id)) issues.push({ path, message: `Reference ${id} does not exist` });
  };
  const rich = (content: RichText, path: string) => {
    for (const span of content) {
      if (span.fieldId) ref(span.fieldId, path);
      if (span.href && !safeUrl(span.href))
        issues.push({ path, message: "Links must use HTTP or HTTPS" });
    }
  };
  for (const b of blocks) {
    if (b.kind === "question") {
      if (!plainText(b.label).trim()) issues.push({ path: b.id, message: "Add a question label" });
      rich(b.label, b.id);
      rich(b.description, b.id);
      if (b.min !== undefined && b.max !== undefined && b.min > b.max)
        issues.push({ path: b.id, message: "Minimum exceeds maximum" });
      if (
        ["multiple_choice", "checkboxes", "dropdown", "multi_select", "ranking", "matrix"].includes(
          b.type,
        )
      ) {
        const optIds = new Set();
        for (const opt of b.options) {
          if (!opt.label.trim() || optIds.has(opt.id))
            issues.push({ path: b.id, message: "Options need unique IDs and non-empty labels" });
          optIds.add(opt.id);
        }
        if (!b.options.length) issues.push({ path: b.id, message: "Add at least one option" });
      }
      if (["rating", "linear_scale"].includes(b.type)) {
        const min = b.min ?? (b.type === "rating" ? 1 : 0),
          max = b.max ?? 5;
        if (!Number.isInteger(min) || !Number.isInteger(max) || max - min > 20)
          issues.push({
            path: b.id,
            message: "Scales need integer endpoints and at most 21 steps",
          });
      }
      if (
        b.type === "matrix" &&
        (!b.rows.length ||
          new Set(b.rows.map((row) => row.id)).size !== b.rows.length ||
          b.rows.some((row) => !row.label.trim()))
      )
        issues.push({ path: b.id, message: "Matrix rows need unique IDs and non-empty labels" });
    } else {
      rich(b.content, b.id);
      if ((b.kind === "image" || b.kind === "embed") && b.url && !safeUrl(b.url))
        issues.push({ path: b.id, message: "Media must use HTTP or HTTPS" });
    }
  }
  const pages = pagesOf(form),
    pageIds = pages.map((p) => p.id);
  for (const page of pages)
    if (
      page.ending &&
      page.blocks.some(
        (b) =>
          b.kind === "question" ||
          (b.kind === "columns" &&
            b.columns.some((c) => c.blocks.some((child) => child.kind === "question"))),
      )
    )
      issues.push({
        path: page.id,
        message: "Endings cannot contain questions; move them before the ending",
      });
  const fieldPages = new Map<string, number>();
  pages.forEach((page, index) => {
    for (const block of page.blocks) {
      if (block.kind === "columns")
        for (const column of block.columns)
          for (const child of column.blocks) fieldPages.set(child.id, index);
      else fieldPages.set(block.id, index);
    }
  });
  const calculationPages = (id: string, seen = new Set<string>()): number[] => {
    if (seen.has(id)) return [];
    seen.add(id);
    const direct = fieldPages.get(id);
    const derived =
      form.calculations
        .find((c) => c.id === id)
        ?.expression.args.flatMap((a) =>
          "fieldId" in a ? calculationPages(a.fieldId, seen) : [],
        ) ?? [];
    const controlled = form.rules
      .filter((r) => r.actions.some((a) => a.target === id && a.type !== "jump"))
      .flatMap((r) => conditionRefs(r.when).flatMap((ref) => calculationPages(ref, seen)));
    const parent = form.blocks.find(
      (b) =>
        b.kind === "columns" && b.columns.some((c) => c.blocks.some((child) => child.id === id)),
    );
    return [
      ...(direct === undefined ? [] : [direct]),
      ...derived,
      ...controlled,
      ...(parent ? calculationPages(parent.id, seen) : []),
    ];
  };
  for (const rule of form.rules) {
    for (const id of conditionRefs(rule.when)) ref(id, rule.id);
    for (const a of rule.actions) {
      if ((a.type === "show" || a.type === "hide") && pageIds.includes(a.target))
        issues.push({ path: rule.id, message: "Use a forward jump to skip a page" });
      if (
        a.type === "jump" &&
        conditionRefs(rule.when).some((id) =>
          calculationPages(id).some((index) => index > pageIds.indexOf(a.target)),
        )
      )
        issues.push({
          path: rule.id,
          message: "Page jumps can only depend on this page or earlier pages",
        });
      if (!ids.has(a.target))
        issues.push({ path: rule.id, message: "Action target no longer exists" });
      if (a.type === "require" && !questions(form).some((q) => q.id === a.target))
        issues.push({ path: rule.id, message: "Required actions must target a question" });
      if (
        a.type === "jump" &&
        (pageIds.indexOf(a.target) < 0 ||
          !a.to ||
          pageIds.indexOf(a.to) <= pageIds.indexOf(a.target))
      )
        issues.push({ path: rule.id, message: "Page jumps must target a later page" });
    }
  }
  for (const c of form.calculations)
    for (const a of c.expression.args) if ("fieldId" in a) ref(a.fieldId, c.id);
  for (const id of dependencyOrder(form).cycles)
    issues.push({ path: id, message: "Circular logic dependency" });
  return issues;
}
function evaluateValues(form: FormDefinition, raw: Answers, excluded: Set<string>) {
  const values: Answers = {},
    visible: Record<string, boolean> = {},
    required: Record<string, boolean> = {},
    jumps: Record<string, string> = {};
  const blocks = new Map(allBlocks(form).map((b) => [b.id, b]));
  const calculations = new Map(form.calculations.map((c) => [c.id, c]));
  const parentColumns = new Map<string, string>();
  for (const b of form.blocks)
    if (b.kind === "columns")
      for (const c of b.columns) for (const child of c.blocks) parentColumns.set(child.id, b.id);
  for (const id of dependencyOrder(form).order) {
    const b = blocks.get(id);
    let show = b?.kind === "question" ? !b.hidden : true;
    let require = b?.kind === "question" && b.required;
    for (const r of form.rules) {
      if (!matches(r.when, values)) continue;
      for (const a of r.actions)
        if (a.target === id) {
          if (a.type === "show") show = true;
          if (a.type === "hide") show = false;
          if (a.type === "require") require = true;
          if (a.type === "jump" && a.to) jumps[id] = a.to;
        }
    }
    const parent = parentColumns.get(id);
    show = show && !excluded.has(id) && (!parent || visible[parent] !== false);
    visible[id] = show;
    required[id] = Boolean(require);
    const c = calculations.get(id);
    const value = c
      ? calculate(c.expression, values)
      : (raw[id] ?? (b?.kind === "question" ? b.defaultValue : undefined));
    if (show && value !== undefined) values[id] = value;
  }
  return { values, visible, required, jumps };
}
export function evaluate(form: FormDefinition, raw: Answers) {
  const excluded = new Set<string>(),
    pages = pagesOf(form);
  let result = evaluateValues(form, raw, excluded);
  // Forward-only jumps can successively exclude later pages. Re-evaluate derived
  // values against that active set so locally preserved answers never leak into
  // calculations, conditions or answer piping after their page is skipped.
  for (let pass = 0; pass < pages.length; pass++) {
    const route = new Set(reachablePages(form, result.jumps));
    let changed = false;
    for (const page of pages)
      if (!route.has(page.id))
        for (const block of page.blocks) {
          const ids =
            block.kind === "columns"
              ? [block.id, ...block.columns.flatMap((c) => c.blocks.map((b) => b.id))]
              : [block.id];
          for (const id of ids)
            if (!excluded.has(id)) {
              excluded.add(id);
              changed = true;
            }
        }
    if (!changed) break;
    result = evaluateValues(form, raw, excluded);
  }
  return result;
}
export function reachablePages(form: FormDefinition, jumps: Record<string, string>) {
  const pages = pagesOf(form),
    route: string[] = [];
  let index = 0;
  while (index < pages.length) {
    const p = pages[index];
    if (!p) break;
    route.push(p.id);
    if (p.ending) break;
    const target = jumps[p.id];
    const dest = target ? pages.findIndex((x) => x.id === target) : -1;
    index = dest > index ? dest : index + 1;
  }
  return route;
}
export function validateAnswers(form: FormDefinition, raw: Answers, pageId?: string) {
  const state = evaluate(form, raw),
    errors: Record<string, string> = {};
  const pages = pagesOf(form),
    route = new Set(reachablePages(form, state.jumps));
  const allowed = new Set(
    pages
      .filter((p) => route.has(p.id) && (!pageId || p.id === pageId))
      .flatMap((p) =>
        p.blocks.flatMap((b) =>
          b.kind === "columns" ? b.columns.flatMap((c) => c.blocks.map((x) => x.id)) : [b.id],
        ),
      ),
  );
  const answers: Answers = {};
  for (const q of questions(form)) {
    if (!state.visible[q.id] || !allowed.has(q.id)) continue;
    const value = state.values[q.id],
      present = hasAnswer(value);
    if (state.required[q.id] && (!present || (q.type === "consent" && value !== true))) {
      errors[q.id] = "This field is required";
      continue;
    }
    if (!present || value === undefined) continue;
    const str = String(value);
    let error = "";
    const numberTypes = ["number", "rating", "linear_scale"];
    const multiTypes = ["checkboxes", "multi_select", "ranking"];
    if (numberTypes.includes(q.type)) {
      const min = q.min ?? (q.type === "rating" ? 1 : q.type === "linear_scale" ? 0 : undefined);
      const max = q.max ?? (q.type === "number" ? undefined : 5);
      if (typeof value !== "number" || !Number.isFinite(value)) error = "Enter a number";
      else if (q.type !== "number" && !Number.isInteger(value))
        error = "Choose a whole-number rating";
      else if (min !== undefined && value < min) error = `Minimum is ${min}`;
      else if (max !== undefined && value > max) error = `Maximum is ${max}`;
      else if (
        q.step !== undefined &&
        Math.abs((value - (min ?? 0)) / q.step - Math.round((value - (min ?? 0)) / q.step)) > 1e-8
      )
        error = `Use increments of ${q.step}`;
    } else if (multiTypes.includes(q.type)) {
      if (
        !Array.isArray(value) ||
        value.some((v) => !q.options.some((o) => o.id === v)) ||
        new Set(value).size !== value.length
      )
        error = "Choose valid options";
      else if (q.type === "ranking" && value.length !== q.options.length)
        error = "Rank every option";
      else if (q.min !== undefined && value.length < q.min) error = `Choose at least ${q.min}`;
      else if (q.max !== undefined && value.length > q.max) error = `Choose at most ${q.max}`;
    } else if (["multiple_choice", "dropdown"].includes(q.type)) {
      if (typeof value !== "string" || !q.options.some((o) => o.id === value))
        error = "Choose a valid option";
    } else if (q.type === "matrix") {
      if (
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.entries(value).some(
          ([r, c]) => !q.rows.some((x) => x.id === r) || !q.options.some((x) => x.id === c),
        )
      )
        error = "Choose valid matrix answers";
      else if (state.required[q.id] && q.rows.some((r) => !value[r.id])) error = "Answer every row";
    } else if (q.type === "consent") {
      if (typeof value !== "boolean") error = "Select the checkbox";
    } else if (q.type === "file") {
      if (!Array.isArray(value) || value.some((v) => !/^[0-9a-f-]{36}$/i.test(v)))
        error = "Complete the upload";
      else if (value.length > (q.maxFiles ?? 1)) error = "Too many files";
    } else if (typeof value !== "string") error = "Enter text";
    else if (q.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
      error = "Please enter a valid email";
    else if (q.type === "url" && !safeUrl(str)) error = "Please enter a valid URL";
    else if (q.type === "phone" && !/^\+?[\d ()-]{7,25}$/.test(str))
      error = "Please enter a valid phone number";
    else if (
      q.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(str) ||
        Number.isNaN(Date.parse(str)) ||
        new Date(str).toISOString().slice(0, 10) !== str)
    )
      error = "Choose a valid date";
    else if (q.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(str))
      error = "Choose a valid time";
    else if (q.type === "signature" && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(str))
      error = "Draw your signature";
    else if (["short_text", "long_text"].includes(q.type)) {
      if (q.min !== undefined && str.length < q.min) error = `Use at least ${q.min} characters`;
      if (q.max !== undefined && str.length > q.max) error = `Use at most ${q.max} characters`;
    }
    if (error) errors[q.id] = error;
    else answers[q.id] = value;
  }
  for (const h of [...form.hiddenFields, ...form.calculations]) {
    const value = state.values[h.id];
    if (value !== undefined) answers[h.id] = value;
  }
  return { answers, errors, state, valid: Object.keys(errors).length === 0 };
}
export function displayAnswer(form: FormDefinition, id: string, values: Answers): string {
  const value = values[id];
  const q = questions(form).find((q) => q.id === id);
  if (value === undefined) return "";
  if (Array.isArray(value))
    return value.map((v) => q?.options.find((o) => o.id === v)?.label ?? v).join(", ");
  if (typeof value === "object")
    return Object.entries(value)
      .map(
        ([r, c]) =>
          `${q?.rows.find((x) => x.id === r)?.label ?? r}: ${q?.options.find((x) => x.id === c)?.label ?? c}`,
      )
      .join(", ");
  return q?.options.find((o) => o.id === value)?.label ?? String(value);
}
