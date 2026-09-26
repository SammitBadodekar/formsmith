import "@formsmith/editor/styles.css";
import "@formsmith/renderer/styles.css";
import {
  createForm,
  type FormDefinition,
  formSchema,
  safeUrl,
  validateDefinition,
} from "@formsmith/core";
import { type EditorHandle, FormEditor } from "@formsmith/editor";
import { formThemeStyle } from "@formsmith/renderer";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Database,
  ImagePlus,
  Link2,
  Settings2,
  Share2,
  SlidersHorizontal,
  SmilePlus,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ApiError, api, authClient, type FormRecord, type Page } from "./api";
import { Connectors } from "./connectors";
import { WorkspaceSidebar } from "./dashboard";
import { BuilderSkeleton, PanelSkeleton } from "./loading";
import { LogicSettings } from "./logic-settings";
import { MediaPicker } from "./media-picker";
import { FormPreview } from "./preview";
import { cacheSavedForm, formQuery, resourceQuery } from "./queries";
import { ResponseDetails, type ResponseRow } from "./response-details";
import { ThemeSettings } from "./theme-settings";

type ManagementPanel = "share" | "responses" | "connectors" | "settings";
type BuilderPanel = ManagementPanel | "customize" | "preview" | "logic" | null;
function isManagementPanel(panel: BuilderPanel): panel is ManagementPanel {
  return (
    panel === "share" || panel === "responses" || panel === "connectors" || panel === "settings"
  );
}
export default function Builder({
  id,
  requestedPanel,
}: {
  id?: string;
  requestedPanel?: ManagementPanel;
}) {
  const { data: session } = authClient.useSession();
  const [mediaKind, setMediaKind] = useState<"logo" | "cover" | null>(null);
  const [copied, setCopied] = useState(false);
  const [record, setRecord] = useState<FormRecord | null>(null),
    [form, setForm] = useState<FormDefinition | null>(null),
    [error, setError] = useState(""),
    [saveStatus, setSaveStatus] = useState("Saved"),
    [panel, setPanelState] = useState<BuilderPanel>(requestedPanel ?? null),
    [publishing, setPublishing] = useState(false);
  const editor = useRef<EditorHandle>(null),
    current = useRef<FormDefinition | null>(null),
    stored = useRef<FormRecord | null>(null),
    saving = useRef<Promise<void> | null>(null),
    conflicted = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formLoad = useQuery({
    ...formQuery(id ?? "new"),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const saveMutation = useMutation({
    mutationFn: ({
      formId,
      definition,
      revision,
    }: {
      formId: string;
      definition: FormDefinition;
      revision: number;
    }) => api<FormRecord>(`/forms/${formId}`, { method: "PATCH", body: { definition, revision } }),
    onSuccess: (saved) => cacheSavedForm(queryClient, saved),
  });
  useEffect(() => {
    // Clearing the management URL must not dismiss a just-opened editor panel.
    setPanelState((previous) => requestedPanel ?? (isManagementPanel(previous) ? null : previous));
  }, [requestedPanel]);
  const setPanel = (next: BuilderPanel) => {
    setPanelState(next);
    if (!id) return;
    const routePanel = isManagementPanel(next) ? next : undefined;
    if (routePanel !== requestedPanel)
      void navigate({
        to: "/forms/$formId",
        params: { formId: id },
        search: { panel: routePanel },
      });
  };
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
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/f/${id}`);
      setCopied(true);
    } catch {
      setError("Couldn’t copy the link. Select and copy it from the Share page.");
    }
  };
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);
  useEffect(() => {
    // Hydrate once. Query refreshes must never replace a locally edited document.
    if (current.current) return;
    if (id) {
      if (!formLoad.data || formLoad.isFetching) return;
      stored.current = formLoad.data;
      current.current = formLoad.data.draft;
      setRecord(formLoad.data);
      setForm(formLoad.data.draft);
    } else {
      let draft = createForm();
      try {
        const raw = localStorage.getItem("formsmith:draft");
        if (raw) draft = formSchema.parse(JSON.parse(raw));
      } catch {}
      current.current = draft;
      setForm(draft);
    }
  }, [id, formLoad.data, formLoad.isFetching]);
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
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
    const pending = saveMutation
      .mutateAsync({ formId: id, definition: snapshot, revision })
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
  const publication = useQuery({
    ...resourceQuery<FormRecord>(`/forms/${id}`),
    queryKey: ["publication", id ?? "new"],
    enabled: Boolean(id && panel === "share"),
    staleTime: 0,
    refetchInterval: (query) => {
      const value = query.state.data;
      return value && value.syncedPolicyRevision < value.policyRevision ? 2000 : false;
    },
  });
  useEffect(() => {
    const latest = publication.data;
    if (!latest) return;
    // Only publication metadata is refreshed; the editor owns its save revision and draft.
    const metadata = {
      publishedVersionId: latest.publishedVersionId,
      closed: latest.closed,
      policyRevision: latest.policyRevision,
      syncedPolicyRevision: latest.syncedPolicyRevision,
    };
    if (stored.current) stored.current = { ...stored.current, ...metadata };
    setRecord((value) => (value ? { ...value, ...metadata } : value));
  }, [publication.data]);
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
          void queryClient.invalidateQueries({ queryKey: ["forms", "list"] });
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
      if (stored.current) cacheSavedForm(queryClient, stored.current);
      void queryClient.invalidateQueries({ queryKey: ["publication", id] });
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
  if (!form)
    return error || formLoad.error ? (
      <main className="message-page">
        <h1>Couldn’t open this form</h1>
        <p role="alert" className="error">
          {error || formLoad.error?.message}
        </p>
        <Link to="/" className="button">
          Back to workspace
        </Link>
      </main>
    ) : (
      <BuilderSkeleton />
    );
  const managing = isManagementPanel(panel);
  const hasCover = Boolean(form.theme.cover && safeUrl(form.theme.cover));
  const hasLogo = Boolean(form.theme.logo && safeUrl(form.theme.logo));
  const updateTheme = (changes: Partial<FormDefinition["theme"]>) => {
    const latest = editor.current?.getDefinition();
    if (latest)
      editor.current?.setDefinition({ ...latest, theme: { ...latest.theme, ...changes } });
  };
  return (
    <div
      className={`builder${id && session ? " with-sidebar" : ""}${managing ? " is-managing" : ""}`}
      style={{ ...formThemeStyle(form.theme), background: form.theme.background }}
    >
      {id && session && (
        <WorkspaceSidebar
          user={session.user}
          select={(section) => void navigate({ to: "/", search: { section } })}
        />
      )}
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
          {managing ? (
            <>
              {record?.publishedVersionId && (
                <button type="button" className="button subtle" onClick={() => void copyLink()}>
                  {copied ? "Copied" : "Copy share link"}
                </button>
              )}
              <button type="button" className="button primary" onClick={() => setPanel(null)}>
                Edit form
              </button>
            </>
          ) : (
            <>
              {record?.publishedVersionId && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Share form"
                  title="Share"
                  onClick={() => setPanel("share")}
                >
                  <Share2 size={16} />
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                aria-label="Form settings"
                title="Settings"
                onClick={() => setPanel("settings")}
              >
                <Settings2 size={16} />
              </button>
              <button type="button" className="button subtle" onClick={() => setPanel("customize")}>
                Customize
              </button>
              {id && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Integrations"
                  title="Integrations"
                  onClick={() => setPanel("connectors")}
                >
                  <Link2 size={16} />
                </button>
              )}
              {id && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Submissions"
                  title="Submissions"
                  onClick={() => setPanel("responses")}
                >
                  <Database size={16} />
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
            </>
          )}
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
      {hasCover && (
        <div className="builder-cover">
          <img src={form.theme.cover} alt="Form cover" />
          <div className="builder-media-actions">
            <button className="button" type="button" onClick={() => setMediaKind("cover")}>
              Change cover
            </button>
            <button className="button" type="button" onClick={() => updateTheme({ cover: "" })}>
              Remove cover
            </button>
          </div>
        </div>
      )}
      <main
        className={`builder-canvas${hasCover ? " has-cover" : ""}${hasLogo ? " has-logo" : ""}`}
        style={{ ...formThemeStyle(form.theme), maxWidth: form.theme.width }}
      >
        {hasLogo && (
          <div className="builder-logo">
            <img src={form.theme.logo} alt="Form logo" />
            <div className="builder-media-actions">
              <button className="button" type="button" onClick={() => setMediaKind("logo")}>
                Change logo
              </button>
              <button className="button" type="button" onClick={() => updateTheme({ logo: "" })}>
                Remove logo
              </button>
            </div>
          </div>
        )}
        <div className="builder-customize">
          {!hasLogo && (
            <button className="button subtle" type="button" onClick={() => setMediaKind("logo")}>
              <SmilePlus size={16} />
              Add logo
            </button>
          )}
          {!hasCover && (
            <button className="button subtle" type="button" onClick={() => setMediaKind("cover")}>
              <ImagePlus size={16} />
              Add cover
            </button>
          )}
          <button className="button subtle" type="button" onClick={() => setPanel("logic")}>
            Logic
          </button>
          <button className="button subtle" type="button" onClick={() => setPanel("customize")}>
            <SlidersHorizontal size={14} />
            Customize
          </button>
        </div>
        <FormEditor ref={editor} definition={form} onChange={change} uploadMedia={uploadMedia} />
        <div className="builder-submit-row">
          <button className="builder-submit" type="button" onClick={() => setPanel("preview")}>
            {form.settings.submitLabel} <span>→</span>
          </button>
        </div>
      </main>
      {mediaKind && (
        <MediaPicker
          kind={mediaKind}
          value={form.theme[mediaKind]}
          upload={uploadMedia}
          change={(url) => updateTheme({ [mediaKind]: url })}
          close={() => setMediaKind(null)}
        />
      )}
      {panel === "customize" && (
        <Panel title="Customize" close={() => setPanel(null)}>
          <ThemeSettings theme={form.theme} onChange={updateTheme} />
        </Panel>
      )}
      {managing && (
        <div className="form-management-header">
          <div>
            <h1>{form.title || "Untitled form"}</h1>
          </div>
          <nav aria-label="Form navigation">
            {(
              [
                ["responses", "Submissions"],
                ["share", "Share"],
                ["connectors", "Integrations"],
                ["settings", "Settings"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-current={panel === key ? "page" : undefined}
                onClick={() => setPanel(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}
      {panel === "settings" && (
        <Panel page title="Settings" close={() => setPanel(null)}>
          <label>
            Submit button
            <input
              value={form.settings.submitLabel}
              onChange={(e) =>
                editor.current?.setDefinition({
                  ...form,
                  settings: { ...form.settings, submitLabel: e.target.value },
                })
              }
            />
          </label>
          <label>
            Next button
            <input
              value={form.settings.nextLabel}
              onChange={(e) =>
                editor.current?.setDefinition({
                  ...form,
                  settings: { ...form.settings, nextLabel: e.target.value },
                })
              }
            />
          </label>
          {(["resume", "showProgress"] as const).map((key) => (
            <label className="check-setting" key={key}>
              <input
                type="checkbox"
                checked={form.settings[key]}
                onChange={(e) =>
                  editor.current?.setDefinition({
                    ...form,
                    settings: { ...form.settings, [key]: e.target.checked },
                  })
                }
              />
              {key === "resume" ? "Save progress on this device" : "Show progress bar"}
            </label>
          ))}
        </Panel>
      )}
      {panel === "logic" && (
        <Panel title="Form logic" close={() => setPanel(null)} wide>
          <LogicSettings form={form} onChange={(next) => editor.current?.setDefinition(next)} />
        </Panel>
      )}
      {panel === "preview" && <FormPreview form={form} close={() => setPanel(null)} />}
      {panel === "share" && record && (
        <Panel page title="Share your form" close={() => setPanel(null)}>
          <p>
            {record.syncedPolicyRevision < record.policyRevision
              ? "Publishing is synchronizing. The link becomes available when synchronization completes."
              : record.publishedVersionId
                ? "Your form is live."
                : "Publish your form to create a shareable link."}
          </p>
          {record.publishedVersionId ? (
            <>
              <label>
                Form link
                <input readOnly value={`${location.origin}/f/${id}`} />
              </label>
              <button type="button" className="button" onClick={() => void copyLink()}>
                {copied ? "Copied" : "Copy link"}
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
                    cacheSavedForm(queryClient, saved);
                    void queryClient.invalidateQueries({ queryKey: ["publication", id] });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not change availability");
                  }
                }}
              >
                {record.closed ? "Reopen form" : "Close form"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button primary"
              disabled={publishing}
              onClick={() => void publish()}
            >
              {publishing ? "Publishing…" : "Publish form"}
            </button>
          )}
        </Panel>
      )}
      {panel === "responses" && id && (
        <Panel page title="Submissions" close={() => setPanel(null)} wide>
          <Responses id={id} />
        </Panel>
      )}
      {panel === "connectors" && id && (
        <Panel page title="Connect your form" close={() => setPanel(null)} wide>
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
  page,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
  page?: boolean;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [close]);
  return (
    <aside className={`settings-panel ${wide ? "wide" : ""} ${page ? "management-panel" : ""}`}>
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
function Responses({ id }: { id: string }) {
  const query = useInfiniteQuery({
    queryKey: ["submissions", id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api<Page<ResponseRow>>(
        `/forms/${id}/submissions${pageParam ? `?${new URLSearchParams({ cursor: pageParam })}` : ""}`,
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 15_000,
  });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const error = query.error?.message;
  const loading = query.isPending || query.isFetchingNextPage;
  const nextCursor = query.hasNextPage;
  const more = () => !query.isFetching && query.fetchNextPage();
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
      {error && (
        <div className="workspace-error" role="alert">
          <span>{error}</span>
          <button type="button" className="button" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      )}
      {rows.length ? (
        rows.map((row) => <ResponseDetails key={row.id} row={row} />)
      ) : loading ? (
        <PanelSkeleton label="Loading submissions" />
      ) : (
        !error && <p className="muted">No submissions yet.</p>
      )}
      {nextCursor && (
        <button type="button" className="button" disabled={loading} onClick={() => void more()}>
          {loading ? "Loading…" : "Load more responses"}
        </button>
      )}
    </>
  );
}
