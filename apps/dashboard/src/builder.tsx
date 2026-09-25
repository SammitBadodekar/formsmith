import "@formsmith/editor/styles.css";
import "@formsmith/renderer/styles.css";
import { createForm, type FormDefinition, formSchema, validateDefinition } from "@formsmith/core";
import { type EditorHandle, FormEditor, ImageUpload } from "@formsmith/editor";
import { FormRenderer } from "@formsmith/renderer";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ApiError, api, type FormRecord, type Page } from "./api";
import { Connectors } from "./connectors";
import { LogicSettings } from "./logic-settings";
import { ResponseDetails, type ResponseRow } from "./response-details";

export default function Builder({ id }: { id?: string }) {
  const [record, setRecord] = useState<FormRecord | null>(null),
    [form, setForm] = useState<FormDefinition | null>(null),
    [error, setError] = useState(""),
    [saveStatus, setSaveStatus] = useState("Saved"),
    [panel, setPanel] = useState<
      "customize" | "preview" | "share" | "responses" | "connectors" | "logic" | null
    >(() =>
      new URLSearchParams(location.search).get("panel") === "connectors"
        ? "connectors"
        : new URLSearchParams(location.search).get("panel") === "share"
          ? "share"
          : null,
    ),
    [publishing, setPublishing] = useState(false);
  const editor = useRef<EditorHandle>(null),
    current = useRef<FormDefinition | null>(null),
    stored = useRef<FormRecord | null>(null),
    saving = useRef<Promise<void> | null>(null),
    conflicted = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const uploadMedia = id
    ? async (file: File) => {
        const target = await api<{ id: string; url: string; headers: Record<string, string> }>(
          `/forms/${id}/media`,
          {
            method: "POST",
            body: { fileName: file.name, contentType: file.type, bytes: file.size },
          },
        );
        const response = await fetch(target.url, {
          method: "PUT",
          headers: target.headers,
          body: file,
        });
        if (!response.ok && response.status !== 412) throw new Error("Image upload failed");
        const completed = await api<{ url: string }>(`/forms/${id}/media/${target.id}`, {
          method: "POST",
        });
        return completed.url;
      }
    : undefined;
  useEffect(() => {
    let active = true;
    if (id)
      api<FormRecord>(`/forms/${id}`)
        .then((f) => {
          if (active) {
            stored.current = f;
            current.current = f.draft;
            setRecord(f);
            setForm(f.draft);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    else {
      let draft = createForm();
      try {
        const raw = localStorage.getItem("formsmith:draft");
        if (raw) draft = formSchema.parse(JSON.parse(raw));
      } catch {}
      current.current = draft;
      setForm(draft);
    }
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id]);
  const save = async (): Promise<void> => {
    if (saving.current) {
      await saving.current;
      if (current.current !== stored.current?.draft && id) await save();
      return;
    }
    if (!id || !current.current || !stored.current || current.current === stored.current.draft)
      return;
    if (conflicted.current)
      throw new Error(
        "Reload this form to resolve the editing conflict. Export your draft first to keep your changes.",
      );
    const snapshot = current.current,
      revision = stored.current.revision;
    setSaveStatus("Saving…");
    const pending = api<FormRecord>(`/forms/${id}`, {
      method: "PATCH",
      body: { definition: snapshot, revision },
    })
      .then((saved) => {
        stored.current = { ...saved, draft: snapshot };
        setRecord(saved);
        setSaveStatus(current.current === snapshot ? "Saved" : "Unsaved changes");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 409) conflicted.current = true;
        setSaveStatus("Not saved");
        setError(e.message);
        throw e;
      })
      .finally(() => {
        saving.current = null;
      });
    saving.current = pending;
    await pending;
  };
  const change = (next: FormDefinition) => {
    current.current = next;
    setForm(next);
    setSaveStatus(id ? "Unsaved changes" : "Saved on this device");
    if (timer.current) clearTimeout(timer.current);
    if (id)
      timer.current = setTimeout(() => {
        void save().catch(() => {});
      }, 700);
    else
      try {
        localStorage.setItem("formsmith:draft", JSON.stringify(next));
      } catch {
        setSaveStatus("Not saved on this device");
      }
  };
  useBlocker({
    enableBeforeUnload: () => Boolean(id && current.current !== stored.current?.draft),
    shouldBlockFn: async () => {
      if (!id || current.current === stored.current?.draft) return false;
      if (timer.current) clearTimeout(timer.current);
      try {
        do {
          await save();
        } while (current.current !== stored.current?.draft);
        return false;
      } catch {
        return !window.confirm(
          "Your latest changes could not be saved. Leave and discard those changes?",
        );
      }
    },
  });
  useEffect(() => {
    if (!id || panel !== "share") return;
    let active = true;
    const refresh = () => {
      void api<FormRecord>(`/forms/${id}`)
        .then((latest) => {
          if (!active) return;
          // Publication reads must never replace the draft's save revision or snapshot.
          const metadata = {
            publishedVersionId: latest.publishedVersionId,
            closed: latest.closed,
            policyRevision: latest.policyRevision,
            syncedPolicyRevision: latest.syncedPolicyRevision,
          };
          if (stored.current) stored.current = { ...stored.current, ...metadata };
          setRecord((value) => (value ? { ...value, ...metadata } : value));
        })
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, panel]);
  const publish = async () => {
    if (!current.current) return;
    setError("");
    setPublishing(true);
    try {
      const issues = validateDefinition(current.current);
      if (issues.length) throw new Error(issues.map((i) => i.message).join(" · "));
      if (!id) {
        let copied = current.current;
        let created = await api<FormRecord>("/forms", {
          method: "POST",
          body: { definition: current.current },
        });
        const syncCreated = async () => {
          while (current.current && current.current !== copied) {
            copied = current.current;
            created = await api<FormRecord>(`/forms/${created.id}`, {
              method: "PATCH",
              body: {
                revision: created.revision,
                definition: { ...copied, id: created.id },
              },
            });
          }
        };
        try {
          await syncCreated();
          await api(`/forms/${created.id}/publish`, {
            method: "POST",
            body: { revision: created.revision },
          });
          await syncCreated();
          localStorage.removeItem("formsmith:draft");
          await navigate({
            to: "/forms/$formId",
            params: { formId: created.id },
            search: { panel: "share" },
          });
        } catch (e) {
          // Open the saved form after an unsuccessful first publication instead of creating duplicates.
          await navigate({ to: "/forms/$formId", params: { formId: created.id } });
          throw e;
        }
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      do {
        await save();
      } while (current.current !== stored.current?.draft);
      const published = await api<{ versionId: string; policyRevision: number }>(
        `/forms/${id}/publish`,
        {
          method: "POST",
          body: { revision: stored.current?.revision },
        },
      );
      const metadata = {
        publishedVersionId: published.versionId,
        policyRevision: published.policyRevision,
      };
      if (stored.current) stored.current = { ...stored.current, ...metadata };
      setRecord((value) => (value ? { ...value, ...metadata } : value));
      setPanel("share");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        try {
          localStorage.setItem("formsmith:draft", JSON.stringify(current.current));
        } catch {}
        await navigate({ to: "/login" });
      } else setError(e instanceof Error ? e.message : "Publishing failed");
    } finally {
      setPublishing(false);
    }
  };
  if (!form) return <main className="message-page">{error || "Loading form…"}</main>;
  return (
    <div className="builder">
      <header className="builder-header">
        <Link to="/" className="builder-back" aria-label="Back to workspace">
          <ArrowLeft size={15} />
        </Link>
        <span className="breadcrumb">
          My workspace <span>/</span> <strong>{form.title || "Untitled form"}</strong>
        </span>
        <span className="save-status">
          {saveStatus === "Saved" && <Check size={12} />}
          {saveStatus}
        </span>
        <div className="header-actions">
          {id && (
            <button type="button" className="button subtle" onClick={() => setPanel("connectors")}>
              Connect
            </button>
          )}
          {id && (
            <button type="button" className="button subtle" onClick={() => setPanel("responses")}>
              Submissions
            </button>
          )}
          <button type="button" className="button subtle" onClick={() => setPanel("preview")}>
            Preview
          </button>
          <button
            type="button"
            className="button primary"
            disabled={publishing}
            onClick={() => void publish()}
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </header>
      {error && (
        <div className="builder-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      <main className="builder-canvas" style={{ maxWidth: form.theme.width }}>
        <div className="builder-customize">
          <button className="button subtle" type="button" onClick={() => setPanel("logic")}>
            Logic
          </button>
          <button className="button subtle" type="button" onClick={() => setPanel("customize")}>
            <SlidersHorizontal size={14} />
            Customize
          </button>
        </div>
        <FormEditor ref={editor} definition={form} onChange={change} uploadMedia={uploadMedia} />
        <button className="builder-submit" type="button" onClick={() => setPanel("preview")}>
          {form.settings.submitLabel} <span>→</span>
        </button>
      </main>
      {panel === "customize" && (
        <Panel title="Customize" close={() => setPanel(null)}>
          <ThemeSettings form={form} onChange={(next) => editor.current?.setDefinition(next)} />
          {(["logo", "cover"] as const).map((kind) => (
            <ImageUpload
              key={kind}
              upload={uploadMedia}
              label={`Upload ${kind}`}
              onComplete={(url) => {
                const latest = editor.current?.getDefinition();
                if (latest)
                  editor.current?.setDefinition({
                    ...latest,
                    theme: { ...latest.theme, [kind]: url },
                  });
              }}
            />
          ))}
          <button
            className="button"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const a = document.createElement("a"),
                url = URL.createObjectURL(
                  new Blob([JSON.stringify(editor.current?.getDefinition() ?? form, null, 2)], {
                    type: "application/json",
                  }),
                );
              a.href = url;
              a.download = "form.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export form JSON
          </button>
        </Panel>
      )}
      {panel === "logic" && (
        <Panel title="Form logic" close={() => setPanel(null)} wide>
          <LogicSettings form={form} onChange={(next) => editor.current?.setDefinition(next)} />
        </Panel>
      )}
      {panel === "preview" && (
        <div className="preview-overlay">
          <div className="preview-header">
            <span>Preview</span>
            <button className="button" type="button" onClick={() => setPanel(null)}>
              Back to editor
            </button>
          </div>
          <FormRenderer
            definition={form}
            onSubmit={async () => {
              setError("Preview submitted successfully. No response was saved.");
              setPanel(null);
            }}
          />
        </div>
      )}
      {panel === "share" && record && (
        <Panel title="Share your form" close={() => setPanel(null)}>
          <p>
            {record.syncedPolicyRevision < record.policyRevision
              ? "Publishing is synchronizing. The link becomes available when synchronization completes."
              : "Your form is live."}
          </p>
          <label>
            Form link
            <input readOnly value={`${location.origin}/f/${id}`} />
          </label>
          <button
            type="button"
            className="button"
            onClick={() => void navigator.clipboard.writeText(`${location.origin}/f/${id}`)}
          >
            Copy link
          </button>
          <label>
            Embed code
            <textarea
              readOnly
              rows={5}
              value={`<iframe data-formsmith-src="${location.origin}/f/${id}" title="${form.title.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}" width="100%" height="650" style="border:0"></iframe>\n<script async src="${location.origin}/embed.js"></script>`}
            />
          </label>
          <button
            type="button"
            className="button"
            onClick={async () => {
              try {
                await api(`/forms/${id}/closed`, {
                  method: "PATCH",
                  body: { closed: !record.closed },
                });
                const saved = await api<FormRecord>(`/forms/${id}`);
                setRecord(saved);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not change availability");
              }
            }}
          >
            {record.closed ? "Reopen form" : "Close form"}
          </button>
        </Panel>
      )}
      {panel === "responses" && id && (
        <Panel title="Submissions" close={() => setPanel(null)} wide>
          <Responses id={id} />
        </Panel>
      )}
      {panel === "connectors" && id && (
        <Panel title="Connect your form" close={() => setPanel(null)} wide>
          <Connectors formId={id} />
        </Panel>
      )}
    </div>
  );
}
function Panel({
  title,
  children,
  close,
  wide,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  return (
    <aside className={`settings-panel ${wide ? "wide" : ""}`}>
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label="Close panel" onClick={close}>
          ×
        </button>
      </header>
      {children}
    </aside>
  );
}
function ThemeSettings({
  form,
  onChange,
}: {
  form: FormDefinition;
  onChange: (f: FormDefinition) => void;
}) {
  return (
    <>
      <fieldset>
        <legend>Colors</legend>
        {(["background", "text", "accent", "button", "buttonText"] as const).map((key) => (
          <label className="color-setting" key={key}>
            <span>
              {key === "buttonText" ? "Button text" : key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
            <input
              type="color"
              value={form.theme[key]}
              onChange={(e) =>
                onChange({ ...form, theme: { ...form.theme, [key]: e.target.value } })
              }
            />
          </label>
        ))}
      </fieldset>
      <label>
        Page width
        <input
          type="range"
          min={400}
          max={1200}
          step={20}
          value={form.theme.width}
          onChange={(e) =>
            onChange({ ...form, theme: { ...form.theme, width: Number(e.target.value) } })
          }
        />
      </label>
      <label>
        Logo URL
        <input
          value={form.theme.logo}
          onChange={(e) => onChange({ ...form, theme: { ...form.theme, logo: e.target.value } })}
        />
      </label>
      <label>
        Cover image URL
        <input
          value={form.theme.cover}
          onChange={(e) => onChange({ ...form, theme: { ...form.theme, cover: e.target.value } })}
        />
      </label>
      <label>
        Submit button
        <input
          value={form.settings.submitLabel}
          onChange={(e) =>
            onChange({ ...form, settings: { ...form.settings, submitLabel: e.target.value } })
          }
        />
      </label>
      <label className="check-setting">
        <input
          type="checkbox"
          checked={form.settings.resume}
          onChange={(e) =>
            onChange({ ...form, settings: { ...form.settings, resume: e.target.checked } })
          }
        />
        Save progress on this device
      </label>
      <label className="check-setting">
        <input
          type="checkbox"
          checked={form.settings.showProgress}
          onChange={(e) =>
            onChange({ ...form, settings: { ...form.settings, showProgress: e.target.checked } })
          }
        />
        Show progress
      </label>
    </>
  );
}
function Responses({ id }: { id: string }) {
  const [rows, setRows] = useState<ResponseRow[]>([]),
    [error, setError] = useState(""),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Page<(typeof rows)[number]>>(`/forms/${id}/submissions`)
      .then((page) => {
        if (active) {
          setRows(page.items);
          setNextCursor(page.nextCursor);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const more = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const page = await api<Page<(typeof rows)[number]>>(
        `/forms/${id}/submissions?${new URLSearchParams({ cursor: nextCursor })}`,
      );
      setRows((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load responses");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="response-actions">
        <a className="button" href={`/api/forms/${id}/export?format=csv`}>
          Export CSV
        </a>
        <a className="button" href={`/api/forms/${id}/export?format=json`}>
          Export JSON
        </a>
      </div>
      {error && <p className="error">{error}</p>}
      {rows.length ? (
        rows.map((row) => <ResponseDetails key={row.id} row={row} />)
      ) : (
        <p className="muted">{loading ? "Loading responses…" : "No submissions yet."}</p>
      )}
      {nextCursor && (
        <button type="button" className="button" disabled={loading} onClick={() => void more()}>
          {loading ? "Loading…" : "Load more responses"}
        </button>
      )}
    </>
  );
}
