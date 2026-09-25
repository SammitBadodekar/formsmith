import {
  type Block,
  createQuestion,
  type FieldKind,
  type FormDefinition,
  fieldKinds,
  fieldLabels,
  newId,
  plainText,
  type Question,
  questions,
  safeUrl,
} from "@formsmith/core";
import { baseKeymap, chainCommands, exitCode, splitBlock, toggleMark } from "prosemirror-commands";
import { closeHistory, history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import type { Node as PMNode } from "prosemirror-model";
import { EditorState, NodeSelection, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView, type NodeView } from "prosemirror-view";
import {
  type CSSProperties,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  blockToNode,
  documentToForm,
  editorSchema,
  formToDocument,
  stableIdentity,
} from "./document";
import { ImageUpload } from "./image-upload";
import { columnCount, moveToColumn } from "./layout";

export type EditorHandle = {
  getDefinition: () => FormDefinition;
  setDefinition: (form: FormDefinition) => void;
  focus: () => void;
};
export type EditorProps = {
  definition: FormDefinition;
  onChange: (form: FormDefinition) => void;
  uploadMedia?: (file: File) => Promise<string>;
  ref?: Ref<EditorHandle>;
};
type Selection = { id: string; block: Block } | null;
const contentItems = [
  "text",
  "heading",
  "divider",
  "image",
  "embed",
  "columns",
  "page",
  "ending",
] as const;
const titles: Record<string, string> = {
  text: "Text",
  heading: "Heading",
  divider: "Divider",
  image: "Image",
  embed: "Embed",
  columns: "Columns",
  page: "Page break",
  ending: "Thank you page",
  ...fieldLabels,
};
const items = [...fieldKinds, ...contentItems];
type InsertKind = (typeof items)[number];
function makeBlock(kind: InsertKind): Block {
  if (fieldKinds.includes(kind as FieldKind)) return createQuestion(kind as FieldKind);
  if (kind === "columns")
    return {
      kind: "columns",
      id: newId(),
      columns: [1, 2].map(() => ({
        id: newId(),
        width: 50,
        blocks: [{ id: newId(), kind: "text", content: [] }],
      })),
    };
  return {
    kind: kind as (typeof contentItems)[number] & Exclude<Block["kind"], "question" | "columns">,
    id: newId(),
    content: kind === "ending" ? [{ text: "Thank you!" }] : [],
  };
}
function findNode(view: EditorView, id: string) {
  let result: { node: PMNode; pos: number } | undefined;
  view.state.doc.descendants((node, pos) => {
    if (node.attrs.id === id) {
      result = { node, pos };
      return false;
    }
  });
  return result;
}

export function FormEditor({ definition, onChange, ref, uploadMedia }: EditorProps) {
  const mount = useRef<HTMLDivElement>(null),
    viewRef = useRef<EditorView | null>(null),
    changeRef = useRef(onChange);
  changeRef.current = onChange;
  const initialDefinition = useRef(definition);
  const [selection, setSelection] = useState<Selection>(null),
    [menu, setMenu] = useState<{ query: string; pos: number; x: number; y: number } | null>(null),
    [menuIndex, setMenuIndex] = useState(0);
  const menuRef = useRef(menu);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  menuRef.current = menu;
  const indexRef = useRef(menuIndex);
  indexRef.current = menuIndex;
  const insertRef = useRef<(kind: InsertKind) => void>(() => {});
  const inspectRef = useRef<(id: string) => void>(() => {});
  inspectRef.current = (id) => {
    const view = viewRef.current;
    if (!view) return;
    const form = documentToForm(view.state.doc),
      block = form.blocks
        .flatMap((b) => (b.kind === "columns" ? [b, ...b.columns.flatMap((c) => c.blocks)] : [b]))
        .find((b) => b.id === id);
    setSelection(block ? { id, block } : null);
  };
  useImperativeHandle(ref, () => ({
    getDefinition: () => (viewRef.current ? documentToForm(viewRef.current.state.doc) : definition),
    setDefinition: (form) => {
      const view = viewRef.current;
      if (!view) return;
      const doc = formToDocument(form);
      view.dispatch(
        closeHistory(view.state.tr)
          .replaceWith(0, view.state.doc.content.size, doc.content)
          .setDocAttribute("form", doc.attrs.form),
      );
    },
    focus: () => viewRef.current?.focus(),
  }));
  useEffect(() => {
    if (!mount.current) return;
    const run = (action: "duplicate" | "delete" | "up" | "down", id: string) => {
      const view = viewRef.current;
      if (!view) return;
      const found = findNode(view, id);
      if (!found) return;
      const { node, pos } = found,
        tr = closeHistory(view.state.tr);
      if (action === "delete") tr.delete(pos, pos + node.nodeSize);
      if (action === "duplicate") tr.insert(pos + node.nodeSize, node);
      if (action === "up" || action === "down") {
        const resolved = view.state.doc.resolve(pos),
          index = resolved.index(),
          parent = resolved.parent;
        const otherIndex = action === "up" ? index - 1 : index + 1;
        if (otherIndex < 0 || otherIndex >= parent.childCount) return;
        const other = parent.child(otherIndex);
        if (other.type.name === "title") return;
        if (action === "up")
          tr.replaceWith(pos - other.nodeSize, pos + node.nodeSize, [node, other]);
        else tr.replaceWith(pos, pos + node.nodeSize + other.nodeSize, [other, node]);
      }
      view.dispatch(tr.scrollIntoView());
      view.focus();
    };
    const nodeView = (
      initial: PMNode,
      view: EditorView,
      getPos: () => number | undefined,
    ): NodeView => {
      let node = initial;
      const dom = document.createElement("section"),
        contentDOM = document.createElement("div"),
        toolbar = document.createElement("div"),
        preview = document.createElement("div");
      dom.className = `fe-block fe-${node.type.name}`;
      toolbar.className = "fe-block-tools";
      toolbar.contentEditable = "false";
      const button = (label: string, glyph: string, fn: () => void) => {
        const b = document.createElement("button");
        b.type = "button";
        b.title = label;
        b.setAttribute("aria-label", label);
        b.textContent = glyph;
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", fn);
        toolbar.append(b);
        return b;
      };
      const drag = button("Drag block or open settings", "⠿", () =>
        inspectRef.current(node.attrs.id),
      );
      drag.draggable = true;
      drag.addEventListener("mousedown", () => {
        const pos = getPos();
        if (pos !== undefined)
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
      });
      button("Move up", "↑", () => run("up", node.attrs.id));
      button("Move down", "↓", () => run("down", node.attrs.id));
      button("Duplicate block", "⧉", () => run("duplicate", node.attrs.id));
      button("Delete block", "×", () => run("delete", node.attrs.id));
      contentDOM.className =
        node.type.name === "columns" ? "fe-block-content fe-columns-content" : "fe-block-content";
      preview.contentEditable = "false";
      preview.className = "fe-input-preview";
      const render = () => {
        dom.dataset.blockId = node.attrs.id;
        dom.dataset.kind = node.attrs.props?.kind ?? node.attrs.kind ?? "text";
        contentDOM.dataset.placeholder =
          node.type.name === "paragraph" ? "Type '/' to insert blocks" : "";
        preview.replaceChildren();
        if (node.type.name === "question") {
          const q = node.attrs.props as Question;
          dom.dataset.required = String(q.required);
          dom.dataset.hidden = String(q.hidden);
          if (["multiple_choice", "checkboxes", "multi_select", "ranking"].includes(q.type)) {
            for (const option of q.options) {
              const row = document.createElement("div");
              row.className = "fe-choice-preview";
              row.textContent = `${q.type === "multiple_choice" ? "○" : "□"}   ${option.label}`;
              preview.append(row);
            }
          } else {
            const input = document.createElement("div");
            input.className = `fe-field-preview fe-field-${q.type}`;
            input.textContent =
              q.placeholder ||
              (
                {
                  email: "name@example.com",
                  url: "https://",
                  dropdown: "Select an option  ▾",
                  date: "dd / mm / yyyy",
                  time: "hh : mm",
                  rating: "☆ ☆ ☆ ☆ ☆",
                  linear_scale: "0   1   2   3   4   5   6   7   8   9   10",
                  signature: "Draw your signature here",
                  file: "Click to choose a file",
                  consent: "□  I agree",
                  matrix: "Row / column choices",
                } as Record<string, string>
              )[q.type] ||
              "Type your answer here...";
            preview.append(input);
          }
          preview.onclick = () => inspectRef.current(node.attrs.id);
        } else if (node.type.name === "content") {
          const b = node.attrs.props as Exclude<Block, { kind: "question" | "columns" }>;
          if (b.kind === "image" && b.url && safeUrl(b.url)) {
            const image = document.createElement("img");
            image.src = b.url;
            image.alt = b.alt ?? "";
            preview.append(image);
          } else if (["page", "ending", "divider"].includes(b.kind)) {
            const rule = document.createElement("div");
            rule.className = "fe-section-rule";
            rule.textContent = b.kind === "divider" ? "" : (titles[b.kind] ?? "");
            preview.append(rule);
          } else {
            preview.textContent = b.url || `Add ${b.kind} URL in settings`;
            preview.onclick = () => inspectRef.current(node.attrs.id);
          }
        }
      };
      dom.append(toolbar, contentDOM);
      if (node.type.name !== "columns") dom.append(preview);
      render();
      return {
        dom,
        contentDOM,
        update: (next) => {
          if (next.type !== node.type) return false;
          node = next;
          render();
          return true;
        },
        stopEvent: (e) =>
          toolbar.contains(e.target as Node) &&
          e.type !== "dragstart" &&
          e.type !== "dragend" &&
          e.type !== "mousedown",
        ignoreMutation: (m) => m.type !== "selection" && !contentDOM.contains(m.target),
      };
    };
    const view = new EditorView(mount.current, {
      state: EditorState.create({
        doc: formToDocument(initialDefinition.current),
        plugins: [
          history(),
          stableIdentity,
          keymap({
            "Mod-z": undo,
            "Mod-Shift-z": redo,
            "Mod-y": redo,
            "Mod-b": toggleMark(markType("bold")),
            "Mod-i": toggleMark(markType("italic")),
            "Mod-u": toggleMark(markType("underline")),
            "Shift-Enter": chainCommands(exitCode, (state, dispatch) => {
              dispatch?.(
                state.tr.replaceSelectionWith(editorSchema.node("hard_break")).scrollIntoView(),
              );
              return true;
            }),
            Enter: (state, dispatch) => {
              const { $from } = state.selection;
              if ($from.parent.type.name === "title") {
                const at = $from.end(1) + 1;
                const tr = state.tr;
                if (!state.doc.nodeAt(at))
                  tr.insert(at, editorSchema.node("paragraph", { id: newId() }));
                dispatch?.(
                  tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1))).scrollIntoView(),
                );
                return true;
              }
              if ($from.parent.type.name === "label") {
                dispatch?.(
                  state.tr.setSelection(TextSelection.near(state.doc.resolve($from.after() + 1))),
                );
                return true;
              }
              if ($from.parent.type.name === "help") {
                const at = $from.after($from.depth - 1);
                const tr = state.tr.insert(at, editorSchema.node("paragraph", { id: newId() }));
                dispatch?.(tr.setSelection(TextSelection.create(tr.doc, at + 1)).scrollIntoView());
                return true;
              }
              return splitBlock(state, dispatch);
            },
          }),
          keymap(baseKeymap),
        ],
      }),
      attributes: {
        class: "fe-document",
        role: "textbox",
        "aria-label": "Form editor",
        "aria-multiline": "true",
        spellcheck: "true",
      },
      nodeViews: { question: nodeView, paragraph: nodeView, content: nodeView, columns: nodeView },
      decorations(state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.isTextblock && node.content.size === 0)
            decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: "is-empty" }));
        });
        return DecorationSet.create(state.doc, decorations);
      },
      handleKeyDown(_view, event) {
        const current = menuRef.current;
        if (!current || event.isComposing) return false;
        const available = items.filter((kind) =>
          titles[kind]?.toLowerCase().includes(current.query),
        );
        if (event.key === "Escape") {
          setMenu(null);
          return true;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          setMenuIndex(
            (i) =>
              (i + (event.key === "ArrowDown" ? 1 : -1) + available.length) %
              Math.max(1, available.length),
          );
          return true;
        }
        if (event.key === "Enter" && available.length) {
          const item = available[indexRef.current % available.length];
          if (item) insertRef.current(item);
          return true;
        }
        return false;
      },
      dispatchTransaction(tr) {
        const result = view.state.applyTransaction(tr);
        view.updateState(result.state);
        if (result.transactions.some((t) => t.docChanged)) {
          changeRef.current(documentToForm(view.state.doc));
          if (selectionRef.current) inspectRef.current(selectionRef.current.id);
        }
        const { $from, empty } = view.state.selection;
        const match =
          empty && $from.parent.type.name === "paragraph"
            ? /^\/([^\n]*)$/.exec($from.parent.textContent)
            : null;
        if (match && !view.composing) {
          const coords = view.coordsAtPos($from.pos);
          setMenu({
            query: (match[1] ?? "").toLowerCase(),
            pos: $from.before(),
            x: coords.left,
            y: coords.bottom + 8,
          });
          setMenuIndex(0);
        } else setMenu(null);
      },
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);
  insertRef.current = (kind) => {
    const view = viewRef.current;
    if (!view) return;
    const node = blockToNode(makeBlock(kind)),
      current = menuRef.current;
    const tr = closeHistory(view.state.tr);
    let at = current?.pos ?? view.state.doc.content.size;
    if (["columns", "page", "ending"].includes(kind) && view.state.doc.resolve(at).depth > 0)
      at = view.state.doc.content.size;
    const replace = current && at === current.pos ? (view.state.doc.nodeAt(at)?.nodeSize ?? 0) : 0;
    tr.replaceWith(at, at + replace, node);
    tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1))).scrollIntoView();
    view.dispatch(tr);
    setMenu(null);
    view.focus();
    inspectRef.current(node.attrs.id);
  };
  const update = (changes: Partial<Block>) => {
    const view = viewRef.current;
    if (!view || !selection) return;
    const found = findNode(view, selection.id);
    if (!found) return;
    const attrs =
      found.node.type.name === "paragraph"
        ? { ...found.node.attrs, ...changes }
        : { ...found.node.attrs, props: { ...found.node.attrs.props, ...changes } };
    view.dispatch(closeHistory(view.state.tr).setNodeMarkup(found.pos, undefined, attrs));
    inspectRef.current(selection.id);
  };
  const available = items.filter((kind) => titles[kind]?.toLowerCase().includes(menu?.query ?? ""));
  return (
    <div className="fe-editor">
      <div className="fe-format-toolbar" role="toolbar" aria-label="Text formatting">
        {(["bold", "italic", "underline", "strike"] as const).map((mark) => (
          <button
            key={mark}
            type="button"
            title={mark}
            aria-label={mark}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const v = viewRef.current;
              if (v) {
                toggleMark(markType(mark))(v.state, v.dispatch);
                v.focus();
              }
            }}
          >
            {{ bold: "B", italic: "I", underline: "U", strike: "S" }[mark]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const v = viewRef.current;
            if (v) undo(v.state, v.dispatch);
          }}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => {
            const v = viewRef.current;
            if (v) redo(v.state, v.dispatch);
          }}
        >
          Redo
        </button>
        <select
          aria-label="Insert answer piping"
          value=""
          onChange={(e) => {
            const v = viewRef.current;
            if (!v || !e.target.value) return;
            const q = questions(documentToForm(v.state.doc)).find((q) => q.id === e.target.value);
            if (q)
              v.dispatch(
                v.state.tr.replaceSelectionWith(
                  editorSchema.node("reference", {
                    fieldId: q.id,
                    text: plainText(q.label) || "Answer",
                  }),
                ),
              );
          }}
        >
          <option value="">@ Insert answer</option>
          {questions(definition).map((q) => (
            <option key={q.id} value={q.id}>
              {plainText(q.label) || fieldLabels[q.type]}
            </option>
          ))}
        </select>
      </div>
      <div ref={mount} />
      <div className="fe-insert-row">
        <select
          aria-label="Insert block"
          value=""
          onChange={(e) => {
            if (e.target.value) insertRef.current(e.target.value as InsertKind);
          }}
        >
          <option value="">+ Add a block</option>
          {items.map((kind) => (
            <option key={kind} value={kind}>
              {titles[kind]}
            </option>
          ))}
        </select>
      </div>
      {menu && (
        <div
          className="fe-slash-menu"
          role="listbox"
          aria-label="Insert a block"
          style={
            {
              left: Math.min(menu.x, window.innerWidth - 300),
              top: Math.min(menu.y, window.innerHeight - 320),
            } as CSSProperties
          }
        >
          {available.length ? (
            available.map((kind, i) => (
              <button
                key={kind}
                type="button"
                role="option"
                aria-selected={i === menuIndex}
                className={i === menuIndex ? "is-active" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertRef.current(kind)}
              >
                <span>{fieldKinds.includes(kind as FieldKind) ? "≡" : "+"}</span>
                {titles[kind]}
              </button>
            ))
          ) : (
            <p>No matching blocks</p>
          )}
        </div>
      )}
      {selection && (
        <aside className="fe-inspector" aria-label="Block settings">
          <div className="fe-inspector-heading">
            <strong>
              {selection.block.kind === "question"
                ? fieldLabels[selection.block.type]
                : titles[selection.block.kind]}
            </strong>
            <button
              type="button"
              aria-label="Close block settings"
              onClick={() => setSelection(null)}
            >
              ×
            </button>
          </div>
          {!["columns", "page", "ending"].includes(selection.block.kind) && (
            <label>
              Location
              <select
                aria-label="Block location"
                value={
                  definition.blocks
                    .flatMap((b) => (b.kind === "columns" ? b.columns : []))
                    .find((c) => c.blocks.some((b) => b.id === selection.id))?.id ?? ""
                }
                onChange={(e) => {
                  const view = viewRef.current;
                  if (view) {
                    const next = moveToColumn(
                      documentToForm(view.state.doc),
                      selection.id,
                      e.target.value || null,
                    );
                    const doc = formToDocument(next);
                    view.dispatch(
                      closeHistory(view.state.tr).replaceWith(
                        0,
                        view.state.doc.content.size,
                        doc.content,
                      ),
                    );
                  }
                }}
              >
                <option value="">Main form</option>
                {definition.blocks
                  .filter((b) => b.kind === "columns")
                  .flatMap((b, group) =>
                    b.columns.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        Layout {group + 1}, column {i + 1}
                      </option>
                    )),
                  )}
              </select>
            </label>
          )}
          {selection.block.kind === "question" ? (
            <QuestionSettings question={selection.block} update={update} />
          ) : selection.block.kind === "columns" ? (
            <ColumnSettings block={selection.block} view={viewRef.current} />
          ) : ["image", "embed"].includes(selection.block.kind) ? (
            <>
              <label>
                URL
                <input
                  value={selection.block.url ?? ""}
                  onChange={(e) => update({ url: e.target.value })}
                />
              </label>
              <label>
                Alternative text
                <input
                  value={selection.block.alt ?? ""}
                  onChange={(e) => update({ alt: e.target.value })}
                />
              </label>
              {selection.block.kind === "image" && (
                <ImageUpload upload={uploadMedia} onComplete={(url) => update({ url })} />
              )}
            </>
          ) : (
            <p>Edit this block directly in your form.</p>
          )}
        </aside>
      )}
    </div>
  );
}
function QuestionSettings({
  question: q,
  update,
}: {
  question: Question;
  update: (changes: Partial<Question>) => void;
}) {
  return (
    <>
      <label>
        Input type
        <select value={q.type} onChange={(e) => update({ type: e.target.value as FieldKind })}>
          {fieldKinds.map((kind) => (
            <option key={kind} value={kind}>
              {fieldLabels[kind]}
            </option>
          ))}
        </select>
      </label>
      <label className="fe-check">
        <input
          type="checkbox"
          checked={q.required}
          onChange={(e) => update({ required: e.target.checked })}
        />
        Required
      </label>
      <label className="fe-check">
        <input
          type="checkbox"
          checked={q.hidden}
          onChange={(e) => update({ hidden: e.target.checked })}
        />
        Hidden by default
      </label>
      <label>
        Placeholder
        <input value={q.placeholder} onChange={(e) => update({ placeholder: e.target.value })} />
      </label>
      {[
        "number",
        "short_text",
        "long_text",
        "rating",
        "linear_scale",
        "checkboxes",
        "multi_select",
      ].includes(q.type) && (
        <div className="fe-two">
          <label>
            Minimum
            <input
              type="number"
              value={q.min ?? ""}
              onChange={(e) =>
                update({ min: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </label>
          <label>
            Maximum
            <input
              type="number"
              value={q.max ?? ""}
              onChange={(e) =>
                update({ max: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </label>
        </div>
      )}
      {["multiple_choice", "checkboxes", "dropdown", "multi_select", "ranking", "matrix"].includes(
        q.type,
      ) && (
        <fieldset>
          <legend>Options</legend>
          {q.options.map((option) => (
            <div className="fe-option-edit" key={option.id}>
              <input
                aria-label="Option label"
                value={option.label}
                onChange={(e) =>
                  update({
                    options: q.options.map((o) =>
                      o.id === option.id ? { ...o, label: e.target.value } : o,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label={`Delete ${option.label}`}
                onClick={() => update({ options: q.options.filter((o) => o.id !== option.id) })}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update({
                options: [...q.options, { id: newId(), label: `Option ${q.options.length + 1}` }],
              })
            }
          >
            + Add option
          </button>
        </fieldset>
      )}
      {q.type === "matrix" && (
        <fieldset>
          <legend>Rows</legend>
          {q.rows.map((row) => (
            <div className="fe-option-edit" key={row.id}>
              <input
                aria-label="Row label"
                value={row.label}
                onChange={(e) =>
                  update({
                    rows: q.rows.map((r) =>
                      r.id === row.id ? { ...r, label: e.target.value } : r,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label={`Delete ${row.label}`}
                onClick={() => update({ rows: q.rows.filter((r) => r.id !== row.id) })}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update({ rows: [...q.rows, { id: newId(), label: `Row ${q.rows.length + 1}` }] })
            }
          >
            + Add row
          </button>
        </fieldset>
      )}
      {q.type === "file" && (
        <>
          <label>
            Accepted file types
            <input
              placeholder=".pdf,image/*"
              value={q.accept ?? ""}
              onChange={(e) => update({ accept: e.target.value })}
            />
          </label>
          <label>
            Maximum files
            <input
              type="number"
              min={1}
              max={10}
              value={q.maxFiles ?? 1}
              onChange={(e) =>
                update({ maxFiles: Math.max(1, Math.min(10, Number(e.target.value))) })
              }
            />
          </label>
        </>
      )}
    </>
  );
}
function ColumnSettings({
  block,
  view,
}: {
  block: Extract<Block, { kind: "columns" }>;
  view: EditorView | null;
}) {
  return (
    <>
      <label>
        Number of columns
        <select
          value={block.columns.length}
          onChange={(e) => {
            if (!view) return;
            const found = findNode(view, block.id);
            if (found)
              view.dispatch(
                closeHistory(view.state.tr).replaceWith(
                  found.pos,
                  found.pos + found.node.nodeSize,
                  blockToNode(columnCount(block, Number(e.target.value))),
                ),
              );
          }}
        >
          {[2, 3, 4].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </label>
      {block.columns.map((c, i) => (
        <label key={c.id}>
          Column {i + 1} width
          <input
            type="range"
            min={10}
            max={100}
            value={c.width}
            onChange={(e) => {
              if (!view) return;
              const found = findNode(view, c.id);
              if (found)
                view.dispatch(
                  view.state.tr.setNodeMarkup(found.pos, undefined, {
                    ...found.node.attrs,
                    width: Number(e.target.value),
                  }),
                );
            }}
          />
        </label>
      ))}
    </>
  );
}

function markType(name: string) {
  const type = editorSchema.marks[name];
  if (!type) throw new Error(`Unknown mark ${name}`);
  return type;
}
