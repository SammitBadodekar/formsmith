import {
  type Answer,
  type Answers,
  type Block,
  displayAnswer,
  evaluate,
  type FormDefinition,
  pagesOf,
  type Question,
  type Receipt,
  type RichText,
  reachablePages,
  safeUrl,
  validateAnswers,
} from "@formsmith/core";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

export function RichContent({
  content,
  form,
  values = {},
}: {
  content: RichText;
  form?: FormDefinition;
  values?: Answers;
}) {
  return content.map((span, index) => {
    let child: ReactNode =
      span.fieldId && form ? displayAnswer(form, span.fieldId, values) : span.text;
    for (const mark of span.marks ?? []) {
      if (mark === "bold") child = <strong>{child}</strong>;
      if (mark === "italic") child = <em>{child}</em>;
      if (mark === "underline") child = <u>{child}</u>;
      if (mark === "strike") child = <s>{child}</s>;
    }
    if (span.href && safeUrl(span.href))
      child = (
        <a href={span.href} target="_blank" rel="noopener noreferrer">
          {child}
        </a>
      );
    // biome-ignore lint/suspicious/noArrayIndexKey: Rich text spans are stateless runs without domain identities.
    return <span key={`${index}:${span.fieldId ?? "text"}`}>{child}</span>;
  });
}

type InputProps = {
  question: Question;
  value?: Answer;
  onChange: (value: Answer) => void;
  disabled?: boolean;
  invalid?: boolean;
  upload?: (files: File[], question: Question) => Promise<string[]>;
};
export function FieldInput({
  question: q,
  value,
  onChange,
  disabled,
  invalid,
  upload,
}: InputProps) {
  const id = `input-${q.id}`;
  const common = {
    id,
    disabled,
    "aria-labelledby": `label-${q.id}`,
    "aria-describedby": `help-${q.id} error-${q.id}`,
    "aria-invalid": invalid || undefined,
  };
  const selected = Array.isArray(value) ? value : [];
  const toggle = (option: string) =>
    onChange(
      selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option],
    );
  if (q.type === "long_text")
    return (
      <textarea
        {...common}
        placeholder={q.placeholder || "Type your answer here..."}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    );
  if (["multiple_choice", "checkboxes", "multi_select"].includes(q.type))
    return (
      <fieldset className="fs-options" aria-labelledby={`label-${q.id}`}>
        {q.options.map((option, index) => (
          <label
            key={option.id}
            className={`fs-option ${value === option.id || selected.includes(option.id) ? "is-selected" : ""}`}
          >
            <input
              type={q.type === "multiple_choice" ? "radio" : "checkbox"}
              name={q.id}
              disabled={disabled}
              checked={
                q.type === "multiple_choice" ? value === option.id : selected.includes(option.id)
              }
              onChange={() =>
                q.type === "multiple_choice" ? onChange(option.id) : toggle(option.id)
              }
            />
            <span className="fs-option-key" aria-hidden="true">
              {String.fromCharCode(65 + index)}
            </span>
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    );
  if (q.type === "dropdown")
    return (
      <select
        {...common}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{q.placeholder || "Select an option"}</option>
        {q.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  if (q.type === "consent")
    return (
      <label className="fs-consent">
        <input
          {...common}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{q.placeholder || "I agree"}</span>
      </label>
    );
  if (q.type === "rating" || q.type === "linear_scale") {
    const min = Math.ceil(q.min ?? (q.type === "rating" ? 1 : 0)),
      max = Math.floor(q.max ?? 5);
    return (
      <div
        className={`fs-scale ${q.type === "rating" ? "fs-rating" : ""}`}
        role="radiogroup"
        aria-labelledby={`label-${q.id}`}
      >
        {Array.from({ length: Math.max(0, Math.min(21, max - min + 1)) }, (_, i) => i + min).map(
          (n) => (
            <label key={n} className={value === n ? "is-selected" : ""}>
              <input
                type="radio"
                name={q.id}
                aria-label={String(n)}
                checked={value === n}
                disabled={disabled}
                onChange={() => onChange(n)}
              />
              <span aria-hidden="true">{q.type === "rating" ? "☆" : n}</span>
            </label>
          ),
        )}
      </div>
    );
  }
  if (q.type === "ranking") {
    const order = [
      ...selected,
      ...q.options.map((o) => o.id).filter((id) => !selected.includes(id)),
    ];
    const move = (index: number, delta: number) => {
      const next = [...order];
      const item = next.splice(index, 1)[0];
      if (item) next.splice(index + delta, 0, item);
      onChange(next);
    };
    return (
      <ol className="fs-ranking">
        {order.map((option, i) => (
          <li key={option}>
            <span>
              {i + 1}. {q.options.find((o) => o.id === option)?.label}
            </span>
            <button
              type="button"
              aria-label={`Move option ${i + 1} up`}
              disabled={disabled || i === 0}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move option ${i + 1} down`}
              disabled={disabled || i === order.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
          </li>
        ))}
        <li>
          <button type="button" disabled={disabled} onClick={() => onChange(order)}>
            {selected.length ? "Order saved" : "Use this order"}
          </button>
        </li>
      </ol>
    );
  }
  if (q.type === "matrix") {
    const matrix = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return (
      <div className="fs-matrix">
        <table>
          <thead>
            <tr>
              <th scope="col"> </th>
              {q.options.map((o) => (
                <th scope="col" key={o.id}>
                  {o.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.label}</th>
                {q.options.map((o) => (
                  <td key={o.id}>
                    <input
                      aria-label={`${r.label}: ${o.label}`}
                      type="radio"
                      name={`${q.id}-${r.id}`}
                      disabled={disabled}
                      checked={matrix[r.id] === o.id}
                      onChange={() => onChange({ ...matrix, [r.id]: o.id })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (q.type === "file")
    return <UploadInput {...{ question: q, value, onChange, disabled, upload }} />;
  if (q.type === "signature")
    return <SignatureInput {...{ question: q, value, onChange, disabled }} />;
  const type =
    (
      {
        short_text: "text",
        email: "email",
        url: "url",
        phone: "tel",
        number: "number",
        date: "date",
        time: "time",
      } as Record<string, string>
    )[q.type] ?? "text";
  return (
    <input
      {...common}
      type={type}
      placeholder={
        q.placeholder ||
        (q.type === "email"
          ? "name@example.com"
          : q.type === "url"
            ? "https://"
            : "Type your answer here...")
      }
      min={q.min}
      max={q.max}
      step={q.step ?? "any"}
      value={typeof value === "string" || typeof value === "number" ? value : ""}
      onChange={(e) =>
        onChange(
          type === "number" && e.target.value !== "" ? e.target.valueAsNumber : e.target.value,
        )
      }
    />
  );
}

function UploadInput({ question, value, onChange, disabled, upload }: InputProps) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="fs-upload">
      <input
        id={`input-${question.id}`}
        aria-labelledby={`label-${question.id}`}
        type="file"
        disabled={disabled || busy || !upload}
        accept={question.accept}
        multiple={(question.maxFiles ?? 1) > 1}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (!files.length || !upload) return;
          if (files.length > (question.maxFiles ?? 1)) {
            setError(`Choose at most ${question.maxFiles ?? 1} files`);
            return;
          }
          setBusy(true);
          setError("");
          try {
            onChange(await upload(files, question));
          } catch {
            setError("Upload failed. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <span role="status">
        {busy
          ? "Uploading…"
          : Array.isArray(value) && value.length
            ? `${value.length} file(s) uploaded`
            : "Choose a file or drag it here"}
      </span>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function SignatureInput({ question, value, onChange, disabled }: InputProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false);
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (typeof value === "string" && value.startsWith("data:image/png;base64,")) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, c.width, c.height);
      image.src = value;
      return () => {
        image.onload = null;
      };
    }
  }, [value]);
  return (
    <div className="fs-signature">
      <canvas
        ref={canvas}
        width={1000}
        height={300}
        aria-label={`Draw signature for ${question.label.map((s) => s.text).join("")}`}
        onPointerDown={(e) => {
          if (disabled) return;
          const c = e.currentTarget,
            ctx = c.getContext("2d");
          if (!ctx) return;
          const r = c.getBoundingClientRect();
          c.setPointerCapture(e.pointerId);
          drawing.current = true;
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.moveTo(
            ((e.clientX - r.left) * c.width) / r.width,
            ((e.clientY - r.top) * c.height) / r.height,
          );
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const c = e.currentTarget,
            r = c.getBoundingClientRect(),
            ctx = c.getContext("2d");
          ctx?.lineTo(
            ((e.clientX - r.left) * c.width) / r.width,
            ((e.clientY - r.top) * c.height) / r.height,
          );
          ctx?.stroke();
        }}
        onPointerUp={(e) => {
          if (drawing.current) {
            drawing.current = false;
            onChange(e.currentTarget.toDataURL("image/png"));
          }
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <button type="button" disabled={disabled} onClick={() => onChange("")}>
        Clear
      </button>
    </div>
  );
}

export type RendererProps = {
  definition: FormDefinition;
  initialAnswers?: Answers;
  disabled?: boolean;
  receipt?: Receipt;
  onAnswersChange?: (answers: Answers) => void;
  onSubmit: (answers: Answers) => Promise<void>;
  upload?: InputProps["upload"];
};
export function FormRenderer({
  definition: form,
  initialAnswers = {},
  onAnswersChange,
  onSubmit,
  upload,
  disabled,
  receipt,
}: RendererProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers),
    [pageId, setPageId] = useState("start"),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const state = useMemo(() => evaluate(form, answers), [form, answers]);
  const pages = pagesOf(form),
    route = reachablePages(form, state.jumps),
    finalPage = pages.find((p) => p.id === route.at(-1)),
    currentId = receipt
      ? finalPage?.ending
        ? finalPage.id
        : "complete"
      : route.includes(pageId)
        ? pageId
        : "start",
    pageIndex = route.indexOf(currentId),
    page = pages.find((p) => p.id === currentId);
  const next = pages.find((p) => p.id === route[pageIndex + 1]),
    isLast = !next || next.ending;
  const change = (id: string, value: Answer) => {
    const updated = { ...answers, [id]: value };
    setAnswers(updated);
    onAnswersChange?.(updated);
    setErrors((e) => {
      const copy = { ...e };
      delete copy[id];
      return copy;
    });
  };
  const block = (b: Block): ReactNode => {
    if (state.visible[b.id] === false) return null;
    if (b.kind === "columns")
      return (
        <div className="fs-columns" key={b.id}>
          {b.columns.map((c) => (
            <div key={c.id} style={{ flex: c.width, minWidth: 0 }}>
              {c.blocks.map(block)}
            </div>
          ))}
        </div>
      );
    if (b.kind === "question")
      return (
        <div
          className={`fs-question ${errors[b.id] ? "has-error" : ""}`}
          id={`question-${b.id}`}
          key={b.id}
        >
          <label className="fs-label" id={`label-${b.id}`} htmlFor={`input-${b.id}`}>
            <RichContent content={b.label} form={form} values={state.values} />
            {state.required[b.id] && <span title="Required"> *</span>}
          </label>
          {b.description.length > 0 && (
            <div className="fs-help" id={`help-${b.id}`}>
              <RichContent content={b.description} form={form} values={state.values} />
            </div>
          )}
          <FieldInput
            question={b}
            value={answers[b.id] ?? b.defaultValue}
            onChange={(value) => change(b.id, value)}
            disabled={disabled || busy}
            invalid={Boolean(errors[b.id])}
            upload={upload}
          />
          {errors[b.id] && (
            <p className="fs-error" id={`error-${b.id}`} role="alert">
              {errors[b.id]}
            </p>
          )}
        </div>
      );
    const content = <RichContent content={b.content} form={form} values={state.values} />;
    if (b.kind === "divider") return <hr key={b.id} />;
    if (b.kind === "image")
      return b.url && safeUrl(b.url) ? (
        <img className="fs-image" key={b.id} src={b.url} alt={b.alt ?? ""} loading="lazy" />
      ) : null;
    if (b.kind === "embed")
      return b.url && safeUrl(b.url) ? (
        <iframe
          key={b.id}
          className="fs-embed"
          title={b.alt || "Embedded content"}
          src={b.url}
          sandbox="allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : null;
    if (b.kind === "heading" || b.kind === "ending")
      return b.level === 3 ? <h3 key={b.id}>{content}</h3> : <h2 key={b.id}>{content}</h2>;
    return (
      <p className="fs-text" key={b.id}>
        {content}
      </p>
    );
  };
  const style = {
    "--fs-bg": form.theme.background,
    "--fs-text": form.theme.text,
    "--fs-accent": form.theme.accent,
    "--fs-button": form.theme.button,
    "--fs-button-text": form.theme.buttonText,
    "--fs-radius": `${form.theme.radius}px`,
    "--fs-width": `${form.theme.width}px`,
    fontSize: form.theme.fontSize,
  } as CSSProperties;
  return (
    <div className="fs-renderer" style={style}>
      {form.theme.cover && safeUrl(form.theme.cover) && (
        <img className="fs-cover" src={form.theme.cover} alt="" />
      )}
      <form
        className="fs-canvas"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || disabled || receipt || page?.ending) return;
          const checked = validateAnswers(form, answers, isLast ? undefined : currentId);
          setErrors(checked.errors);
          setFailure("");
          if (!checked.valid) {
            requestAnimationFrame(() => {
              const id = Object.keys(checked.errors)[0];
              const element =
                document.getElementById(`input-${id}`) ??
                document
                  .getElementById(`question-${id}`)
                  ?.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]");
              element?.focus();
            });
            return;
          }
          if (!isLast && next) {
            setPageId(next.id);
            return;
          }
          setBusy(true);
          try {
            await onSubmit(checked.answers);
            if (next?.ending) setPageId(next.id);
          } catch (error) {
            setFailure(
              error instanceof Error ? error.message : "Could not submit. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {form.theme.logo && safeUrl(form.theme.logo) && (
          <img className="fs-logo" src={form.theme.logo} alt="Form logo" />
        )}
        {currentId === "start" && <h1>{form.title || "Untitled form"}</h1>}
        {page?.blocks.map(block)}
        {receipt && (
          <section className="fs-completion" role="status">
            {!page?.ending && (
              <h1>
                {receipt.status === "committed" ? "Thank you!" : "Your response has been received"}
              </h1>
            )}
            <p>
              {receipt.status === "committed"
                ? "Your response has been submitted."
                : "Your response is safely received and waiting to finish processing. You can close this page."}
            </p>
            <small>Receipt: {receipt.id}</small>
          </section>
        )}
        {!page?.ending && !receipt && (
          <div className="fs-navigation">
            {pageIndex > 0 && (
              <button
                type="button"
                className="fs-back"
                disabled={busy}
                onClick={() => {
                  setPageId(route[pageIndex - 1] ?? "start");
                  setErrors({});
                }}
              >
                ← Back
              </button>
            )}
            <button className="fs-submit" type="submit" disabled={busy || disabled}>
              {busy ? "Submitting…" : isLast ? form.settings.submitLabel : form.settings.nextLabel}
              <span aria-hidden="true"> →</span>
            </button>
          </div>
        )}
        {failure && (
          <p role="alert" className="fs-error">
            {failure}
          </p>
        )}
        {!receipt && form.settings.showProgress && route.length > 1 && (
          <progress
            className="fs-progress"
            aria-label="Form progress"
            max={route.length}
            value={pageIndex + 1}
          />
        )}
        <a
          className="fs-credit"
          href="https://formsmith.samz.in"
          target="_blank"
          rel="noopener noreferrer"
        >
          Made with Formsmith
        </a>
      </form>
    </div>
  );
}
