import { z } from "zod";

export const fieldKinds = [
  "short_text",
  "long_text",
  "email",
  "url",
  "phone",
  "number",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "multi_select",
  "date",
  "time",
  "rating",
  "linear_scale",
  "ranking",
  "matrix",
  "file",
  "signature",
  "consent",
] as const;
export type FieldKind = (typeof fieldKinds)[number];
export const fieldLabels: Record<FieldKind, string> = {
  short_text: "Short answer",
  long_text: "Long answer",
  email: "Email",
  url: "Link",
  phone: "Phone number",
  number: "Number",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  dropdown: "Dropdown",
  multi_select: "Multi-select",
  date: "Date",
  time: "Time",
  rating: "Rating",
  linear_scale: "Linear scale",
  ranking: "Ranking",
  matrix: "Matrix",
  file: "File upload",
  signature: "Signature",
  consent: "Consent",
};
export const idSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/)
  .refine(
    (value) => !["constructor", "prototype", "__proto__"].includes(value),
    "Reserved identifier",
  );
const id = idSchema;
export const richTextSchema = z
  .array(
    z.object({
      text: z.string().max(50000),
      marks: z.array(z.enum(["bold", "italic", "underline", "strike"])).optional(),
      href: z.string().max(2000).optional(),
      fieldId: id.optional(),
    }),
  )
  .max(1000);
export type RichText = z.infer<typeof richTextSchema>;
export const optionSchema = z.object({ id, label: z.string().max(1000) });
export const questionSchema = z.object({
  kind: z.literal("question"),
  id,
  type: z.enum(fieldKinds),
  label: richTextSchema,
  description: richTextSchema,
  required: z.boolean(),
  hidden: z.boolean(),
  placeholder: z.string().max(1000),
  options: z.array(optionSchema).max(1000),
  rows: z.array(optionSchema).max(100),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  accept: z.string().max(500).optional(),
  maxFiles: z.number().int().min(1).max(10).optional(),
});
export type Question = z.infer<typeof questionSchema>;
export const contentSchema = z.object({
  kind: z.enum(["text", "heading", "divider", "image", "embed", "page", "ending"]),
  id,
  content: richTextSchema,
  level: z.number().int().min(1).max(3).optional(),
  url: z.string().max(3000).optional(),
  alt: z.string().max(1000).optional(),
});
export type ContentBlock = z.infer<typeof contentSchema>;
const leafSchema = z.union([questionSchema, contentSchema]);
export type LeafBlock = z.infer<typeof leafSchema>;
export const columnsSchema = z.object({
  kind: z.literal("columns"),
  id,
  columns: z
    .array(
      z.object({
        id,
        width: z.number().positive().max(100),
        blocks: z.array(leafSchema).max(1000),
      }),
    )
    .min(2)
    .max(4),
});
export const blockSchema = z.union([leafSchema, columnsSchema]);
export type Block = z.infer<typeof blockSchema>;
export type ColumnsBlock = z.infer<typeof columnsSchema>;
export type Answer = string | number | boolean | string[] | Record<string, string>;
export type Answers = Record<string, Answer>;
export const answersSchema = z
  .unknown()
  .refine(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).every((key) => id.safeParse(key).success),
    "Invalid answer identifiers",
  )
  .pipe(
    z
      .record(
        id,
        z.union([
          z.string().max(300000),
          z.number().finite(),
          z.boolean(),
          z.array(z.string().max(1000)).max(1000),
          z.record(id, z.string().max(2000)),
        ]),
      )
      .refine((v) => Object.keys(v).length <= 2000, "Too many answers"),
  );
export type Condition =
  | {
      fieldId: string;
      op: "eq" | "neq" | "contains" | "gt" | "lt" | "answered";
      value?: string | number | boolean;
    }
  | { mode: "all" | "any"; conditions: Condition[] };
const boundedCondition = (depth: number): z.ZodType<Condition> =>
  z.lazy(() =>
    z.union([
      z.object({
        fieldId: id,
        op: z.enum(["eq", "neq", "contains", "gt", "lt", "answered"]),
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      }),
      z.object({
        mode: z.enum(["all", "any"]),
        conditions: z
          .array(depth < 8 ? boundedCondition(depth + 1) : z.never())
          .min(1)
          .max(50),
      }),
    ]),
  );
export const conditionSchema = boundedCondition(0);
export const expressionSchema = z.object({
  op: z.enum(["add", "subtract", "multiply", "divide", "concat"]),
  args: z
    .array(
      z.union([
        z.object({ fieldId: id }),
        z.object({ literal: z.union([z.string(), z.number()]) }),
      ]),
    )
    .min(1)
    .max(50),
});
export type Expression = z.infer<typeof expressionSchema>;
export const ruleSchema = z.object({
  id,
  when: conditionSchema,
  actions: z
    .array(
      z.object({
        type: z.enum(["show", "hide", "require", "jump"]),
        target: id,
        to: id.optional(),
      }),
    )
    .min(1)
    .max(100),
});
export type Rule = z.infer<typeof ruleSchema>;
export const themeSchema = z.object({
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  button: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  buttonText: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().min(400).max(1200),
  fontSize: z.number().min(14).max(24),
  radius: z.number().min(0).max(24),
  logo: z.string().max(3000),
  cover: z.string().max(3000),
});
export const formSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  title: z.string().max(500),
  blocks: z.array(blockSchema).max(2000),
  rules: z.array(ruleSchema).max(500),
  calculations: z
    .array(z.object({ id, name: z.string().max(200), expression: expressionSchema }))
    .max(200),
  hiddenFields: z.array(z.object({ id, name: z.string().max(100) })).max(50),
  theme: themeSchema,
  settings: z.object({
    submitLabel: z.string().max(100),
    nextLabel: z.string().max(100),
    resume: z.boolean(),
    showProgress: z.boolean(),
  }),
});
export type FormDefinition = z.infer<typeof formSchema>;
export const submissionSchema = z.object({
  formId: id,
  versionId: id,
  attemptId: z.string().uuid(),
  answers: answersSchema,
  honeypot: z.string().max(500).default(""),
});
export type SubmissionCommand = z.infer<typeof submissionSchema>;
export type Receipt = {
  id: string;
  attemptId: string;
  status: "committed" | "pending";
  receivedAt: string;
};
export const newId = () => crypto.randomUUID();
export const text = (value: string): RichText => [{ text: value }];
export const plainText = (value: RichText) => value.map((s) => s.text).join("");
export const defaultTheme = {
  background: "#ffffff",
  text: "#37352f",
  accent: "#0070d7",
  button: "#000000",
  buttonText: "#ffffff",
  width: 700,
  fontSize: 16,
  radius: 8,
  logo: "",
  cover: "",
};
export function createForm(): FormDefinition {
  return {
    schemaVersion: 1,
    id: newId(),
    title: "",
    blocks: [{ kind: "text", id: newId(), content: [] }],
    rules: [],
    calculations: [],
    hiddenFields: [],
    theme: { ...defaultTheme },
    settings: { submitLabel: "Submit", nextLabel: "Next", resume: false, showProgress: true },
  };
}
export function createQuestion(type: FieldKind): Question {
  return {
    kind: "question",
    id: newId(),
    type,
    label: [],
    description: [],
    required: false,
    hidden: false,
    placeholder: "",
    options: ["Option 1", "Option 2"].map((label) => ({ id: newId(), label })),
    rows: ["Row 1", "Row 2"].map((label) => ({ id: newId(), label })),
    ...(type === "rating"
      ? { min: 1, max: 5 }
      : type === "linear_scale"
        ? { min: 0, max: 10 }
        : {}),
  };
}
export function allBlocks(form: FormDefinition): LeafBlock[] {
  return form.blocks.flatMap((b) =>
    b.kind === "columns" ? b.columns.flatMap((c) => c.blocks) : [b],
  );
}
export function questions(form: FormDefinition): Question[] {
  return allBlocks(form).filter((b): b is Question => b.kind === "question");
}
export function mapBlocks(
  form: FormDefinition,
  fn: (block: LeafBlock) => LeafBlock,
): FormDefinition {
  return {
    ...form,
    blocks: form.blocks.map((b) =>
      b.kind === "columns"
        ? { ...b, columns: b.columns.map((c) => ({ ...c, blocks: c.blocks.map(fn) })) }
        : fn(b),
    ),
  };
}
export type FormPage = { id: string; blocks: Block[]; ending: boolean };
export function pagesOf(form: FormDefinition): FormPage[] {
  const pages: FormPage[] = [{ id: "start", blocks: [], ending: false }];
  for (const b of form.blocks) {
    if (b.kind === "page" || b.kind === "ending")
      pages.push({ id: b.id, blocks: b.kind === "ending" ? [b] : [], ending: b.kind === "ending" });
    else pages[pages.length - 1]?.blocks.push(b);
  }
  return pages;
}
export const hasAnswer = (v: unknown) =>
  v !== undefined &&
  v !== null &&
  v !== "" &&
  (!Array.isArray(v) || v.length > 0) &&
  (!(typeof v === "object" && !Array.isArray(v)) || Object.keys(v).length > 0);
export function safeUrl(value: string, media = false): string | undefined {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol) ||
      (media && u.protocol === "data:" && value.startsWith("data:image/png;base64,"))
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
