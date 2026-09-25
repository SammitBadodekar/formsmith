import {
  type Block,
  blockSchema,
  createForm,
  type FormDefinition,
  newId,
  type RichText,
  safeUrl,
} from "@formsmith/core";
import { type Node as PMNode, Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";

const identity = { id: { default: null } };
export const editorSchema = new Schema({
  nodes: {
    doc: { content: "title block*", attrs: { form: { default: null } } },
    title: {
      content: "inline*",
      marks: "",
      defining: true,
      parseDOM: [{ tag: "h1[data-form-title]" }],
      toDOM: () => ["h1", { "data-form-title": "", "data-placeholder": "Form title" }, 0],
    },
    paragraph: {
      group: "block leaf",
      content: "inline*",
      attrs: { ...identity, kind: { default: "text" }, level: { default: 2 } },
      parseDOM: [
        { tag: "p" },
        { tag: "h2", attrs: { kind: "heading", level: 2 } },
        { tag: "h3", attrs: { kind: "heading", level: 3 } },
      ],
      toDOM: (node) => [
        node.attrs.kind === "heading" ? `h${node.attrs.level}` : "p",
        { "data-block-id": node.attrs.id, "data-placeholder": "Type '/' to insert blocks" },
        0,
      ],
    },
    question: {
      group: "block leaf",
      content: "label help",
      defining: true,
      draggable: true,
      attrs: { ...identity, props: { default: null } },
      parseDOM: [
        {
          tag: "section[data-question]",
          getAttrs: (dom) => {
            try {
              const q = blockSchema.parse(JSON.parse(dom.getAttribute("data-question") ?? "null"));
              return q.kind === "question" ? { id: q.id, props: q } : false;
            } catch {
              return false;
            }
          },
        },
      ],
      toDOM: (node) => [
        "section",
        { "data-question": JSON.stringify(node.attrs.props), "data-block-id": node.attrs.id },
        0,
      ],
    },
    label: {
      content: "inline*",
      defining: true,
      parseDOM: [{ tag: "div[data-label]" }],
      toDOM: () => [
        "div",
        { "data-label": "", class: "fe-label", "data-placeholder": "Question" },
        0,
      ],
    },
    help: {
      content: "inline*",
      parseDOM: [{ tag: "div[data-help]" }],
      toDOM: () => [
        "div",
        { "data-help": "", class: "fe-help", "data-placeholder": "Add help text" },
        0,
      ],
    },
    content: {
      group: "block leaf",
      content: "inline*",
      defining: true,
      draggable: true,
      attrs: { ...identity, props: { default: null } },
      parseDOM: [
        {
          tag: "section[data-content]",
          getAttrs: (dom) => {
            try {
              const b = blockSchema.parse(JSON.parse(dom.getAttribute("data-content") ?? "null"));
              return b.kind !== "columns" && b.kind !== "question" ? { id: b.id, props: b } : false;
            } catch {
              return false;
            }
          },
        },
      ],
      toDOM: (node) => [
        "section",
        { "data-content": JSON.stringify(node.attrs.props), "data-block-id": node.attrs.id },
        0,
      ],
    },
    columns: {
      group: "block",
      content: "column{2,4}",
      defining: true,
      draggable: true,
      attrs: identity,
      parseDOM: [{ tag: "div[data-columns]" }],
      toDOM: (node) => [
        "div",
        { "data-columns": "", "data-block-id": node.attrs.id, class: "fe-columns" },
        0,
      ],
    },
    column: {
      content: "leaf+",
      defining: true,
      attrs: { ...identity, width: { default: 50 } },
      parseDOM: [
        {
          tag: "div[data-column]",
          getAttrs: (dom) => ({
            width: Math.max(1, Math.min(100, Number(dom.getAttribute("data-width")) || 50)),
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          "data-column": "",
          "data-width": node.attrs.width,
          style: `flex:${node.attrs.width};min-width:0`,
        },
        0,
      ],
    },
    text: { group: "inline" },
    reference: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { fieldId: { default: "" }, text: { default: "Answer" } },
      parseDOM: [
        {
          tag: "span[data-reference]",
          getAttrs: (dom) => ({
            fieldId: dom.getAttribute("data-reference"),
            text: dom.textContent,
          }),
        },
      ],
      toDOM: (node) => [
        "span",
        { "data-reference": node.attrs.fieldId, class: "fe-reference" },
        `@${node.attrs.text}`,
      ],
    },
    hard_break: {
      group: "inline",
      inline: true,
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"],
    },
  },
  marks: {
    bold: { parseDOM: [{ tag: "strong" }, { tag: "b" }], toDOM: () => ["strong", 0] },
    italic: { parseDOM: [{ tag: "em" }, { tag: "i" }], toDOM: () => ["em", 0] },
    underline: { parseDOM: [{ tag: "u" }], toDOM: () => ["u", 0] },
    strike: { parseDOM: [{ tag: "s" }, { tag: "del" }], toDOM: () => ["s", 0] },
    link: {
      attrs: { href: {} },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs: (dom) =>
            safeUrl(dom.getAttribute("href") ?? "") ? { href: dom.getAttribute("href") } : false,
        },
      ],
      toDOM: (mark) => [
        "a",
        { href: safeUrl(mark.attrs.href) ?? "", rel: "noopener noreferrer" },
        0,
      ],
    },
  },
});

function inline(content: RichText): PMNode[] {
  return content.flatMap((span) => {
    if (span.fieldId)
      return [editorSchema.node("reference", { fieldId: span.fieldId, text: span.text })];
    if (!span.text) return [];
    const marks = (span.marks ?? []).map((m) => editorSchema.mark(m));
    if (span.href && safeUrl(span.href)) marks.push(editorSchema.mark("link", { href: span.href }));
    return span.text
      .split("\n")
      .flatMap((line, i) => [
        ...(i ? [editorSchema.node("hard_break", null, undefined, marks)] : []),
        ...(line ? [editorSchema.text(line, marks)] : []),
      ]);
  });
}
function rich(node: PMNode): RichText {
  const spans: RichText = [];
  node.forEach((child) => {
    if (child.type.name === "reference")
      spans.push({ text: child.attrs.text, fieldId: child.attrs.fieldId });
    else if (child.isText || child.type.name === "hard_break") {
      const span: RichText[number] = { text: child.isText ? (child.text ?? "") : "\n" };
      const marks = child.marks
        .filter((m) => m.type.name !== "link")
        .map((m) => m.type.name as NonNullable<RichText[number]["marks"]>[number]);
      if (marks.length) span.marks = marks;
      const link = child.marks.find((m) => m.type.name === "link");
      if (link) span.href = link.attrs.href;
      const previous = spans.at(-1);
      if (
        previous &&
        !previous.fieldId &&
        previous.href === span.href &&
        JSON.stringify(previous.marks) === JSON.stringify(span.marks)
      )
        previous.text += span.text;
      else spans.push(span);
    }
  });
  return spans;
}
export function blockToNode(b: Block): PMNode {
  if (b.kind === "columns")
    return editorSchema.node(
      "columns",
      { id: b.id },
      b.columns.map((c) =>
        editorSchema.node(
          "column",
          { id: c.id, width: c.width },
          c.blocks.length
            ? c.blocks.map(blockToNode)
            : [editorSchema.node("paragraph", { id: newId() })],
        ),
      ),
    );
  if (b.kind === "question")
    return editorSchema.node("question", { id: b.id, props: b }, [
      editorSchema.node("label", null, inline(b.label)),
      editorSchema.node("help", null, inline(b.description)),
    ]);
  if (b.kind === "text" || b.kind === "heading")
    return editorSchema.node(
      "paragraph",
      { id: b.id, kind: b.kind, level: b.level ?? 2 },
      inline(b.content),
    );
  return editorSchema.node("content", { id: b.id, props: b }, inline(b.content));
}
function nodeToBlock(node: PMNode): Block {
  if (node.type.name === "columns") {
    const columns: Extract<Block, { kind: "columns" }>["columns"] = [];
    node.forEach((c) => {
      const blocks: Extract<Block, { kind: "columns" }>["columns"][number]["blocks"] = [];
      c.forEach((child) => {
        const b = nodeToBlock(child);
        if (b.kind !== "columns") blocks.push(b);
      });
      columns.push({ id: c.attrs.id, width: c.attrs.width, blocks });
    });
    return { kind: "columns", id: node.attrs.id, columns };
  }
  if (node.type.name === "question")
    return {
      ...node.attrs.props,
      kind: "question",
      id: node.attrs.id,
      label: rich(node.child(0)),
      description: rich(node.child(1)),
    };
  if (node.type.name === "paragraph")
    return {
      kind: node.attrs.kind,
      id: node.attrs.id,
      ...(node.attrs.kind === "heading" ? { level: node.attrs.level } : {}),
      content: rich(node),
    };
  return { ...node.attrs.props, id: node.attrs.id, content: rich(node) };
}
export function formToDocument(form: FormDefinition): PMNode {
  const { blocks, title, ...metadata } = form;
  return editorSchema.node("doc", { form: metadata }, [
    editorSchema.node("title", null, title ? editorSchema.text(title) : undefined),
    ...blocks.map(blockToNode),
  ]);
}
export function documentToForm(doc: PMNode): FormDefinition {
  const blocks: Block[] = [];
  doc.forEach((node, _, index) => {
    if (index > 0) blocks.push(nodeToBlock(node));
  });
  return { ...(doc.attrs.form ?? createForm()), title: doc.child(0).textContent, blocks };
}
// Splits and pasted blocks must receive fresh domain identities. Ordinary moves
// retain theirs. This appended transaction belongs to the originating history event.
export const stableIdentity = new Plugin({
  appendTransaction(transactions, _old, state) {
    if (!transactions.some((t) => t.docChanged)) return null;
    const ids = new Set<string>(),
      tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (!("id" in node.attrs)) return;
      const id = node.attrs.id;
      if (!id || ids.has(id)) {
        const fresh = newId();
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: fresh });
        ids.add(fresh);
      } else ids.add(id);
    });
    return tr.docChanged ? tr : null;
  },
});
