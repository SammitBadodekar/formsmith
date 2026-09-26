import { type FormDefinition, formSchema } from "@formsmith/core";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Globe,
  Home,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { AgentAccess } from "./agent-access";
import { api, authClient, type FormRecord } from "./api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Domains } from "./domains";
import { FormListSkeleton, WorkspaceSkeleton } from "./loading";
import { useFormList } from "./use-form-list";

const FormActions = lazy(() => import("./form-actions"));
export type Section = "home" | "workspace" | "search" | "domains" | "agents" | "settings";
const labels: Record<Section, string> = {
  home: "Home",
  workspace: "My workspace",
  search: "Search",
  domains: "Domains",
  agents: "Agents & API",
  settings: "Settings",
};
export function Dashboard({ login }: { login: React.ReactNode }) {
  const [section, setSection] = useState<Section>(() => {
    const requested = new URLSearchParams(location.search).get("section");
    return requested && requested in labels ? (requested as Section) : "home";
  });
  const [mobileNav, setMobileNav] = useState(false);
  const collapsed = false;
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const {
    forms,
    nextCursor,
    loading,
    error: listError,
    loadMore,
    retry,
  } = useFormList(Boolean(session), section === "search" ? query : "");
  if (isPending) return <WorkspaceSkeleton />;
  if (!session) return login;
  const select = (next: Section) => {
    setSection(next);
    void navigate({ to: "/", search: { section: next } });
    setMobileNav(false);
    setError("");
  };
  const create = async (definition?: FormDefinition) => {
    setBusy(true);
    setError("");
    try {
      const record = await api<FormRecord>("/forms", { method: "POST", body: { definition } });
      await navigate({ to: "/forms/$formId", params: { formId: record.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create form");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`dashboard${mobileNav ? " nav-open" : ""}`}>
      <header className="mobile-workspace-header">
        <button
          type="button"
          className="icon-button"
          aria-label="Open navigation"
          onClick={() => setMobileNav(true)}
        >
          <Menu size={20} />
        </button>
        <span>{labels[section]}</span>
      </header>
      {mobileNav && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <WorkspaceSidebar user={session.user} section={section} select={select} />
      <main className="workspace-main">
        <div className="workspace-topbar">
          <button
            type="button"
            className="icon-button"
            aria-label="Home"
            onClick={() => select("home")}
          >
            <span className="workspace-brand">✳</span>
          </button>
          {section !== "home" && (
            <>
              <span>/</span>
              <span>{labels[section]}</span>
            </>
          )}
        </div>
        <div className="workspace-content">
          {section === "agents" ? (
            <AgentAccess />
          ) : section === "domains" ? (
            <Domains />
          ) : section === "settings" ? (
            <section className="account-settings">
              <h1>Settings</h1>
              <h2>My account</h2>
              <label>
                Name
                <input value={session.user.name} readOnly />
              </label>
              <label>
                Email
                <input value={session.user.email} readOnly />
              </label>
              <p>You’re signed in with Google.</p>
              <button type="button" className="button" onClick={() => void authClient.signOut()}>
                <LogOut size={15} />
                Log out
              </button>
            </section>
          ) : (
            <>
              <div className={`workspace-heading${section === "home" ? " home-heading" : ""}`}>
                <h1>{section === "home" ? "My workspace" : labels[section]}</h1>
                <div className="workspace-heading-actions">
                  <label className="button subtle import-button">
                    <Upload size={14} />
                    <span>Import</span>
                    <input
                      type="file"
                      accept="application/json,.json"
                      disabled={busy}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          if (file.size > 1024 * 1024) throw new Error("Form file is too large");
                          await create(formSchema.parse(JSON.parse(await file.text())));
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Invalid form file");
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy}
                    onClick={() => void create()}
                  >
                    <Plus size={15} />
                    {busy ? "Creating…" : "New form"}
                  </button>
                </div>
              </div>
              {section === "search" && (
                <label className="workspace-search">
                  <Search size={18} />
                  <input
                    aria-label="Search forms"
                    placeholder="Search for a form…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>
              )}
              {(error || listError) && (
                <div className="workspace-error" role="alert">
                  <span>{error || listError}</span>
                  {listError && (
                    <button type="button" className="button" onClick={retry}>
                      Try again
                    </button>
                  )}
                </div>
              )}
              {(section !== "home" || !collapsed) && (
                <>
                  {loading && !forms.length ? (
                    <FormListSkeleton />
                  ) : forms.length ? (
                    <div className="form-list">
                      {forms.map((form) => (
                        <div className="form-row" key={form.id}>
                          <Link
                            className="form-row-main"
                            to="/forms/$formId"
                            params={{ formId: form.id }}
                            search={form.publishedVersionId ? { panel: "share" } : {}}
                          >
                            <div>
                              <div className="form-row-title">
                                <strong>{form.title || "Untitled form"}</strong>
                              </div>
                            </div>
                            <span className="form-row-meta">
                              {!form.publishedVersionId
                                ? "Draft"
                                : form.closed
                                  ? "Closed"
                                  : "Published"}{" "}
                              · {relativeDate(form.updatedAt)}
                            </span>
                          </Link>
                          <div className="form-row-actions">
                            <Link
                              className="button subtle"
                              to="/forms/$formId"
                              params={{ formId: form.id }}
                            >
                              Edit
                            </Link>
                            <Suspense fallback={<span className="icon-button" />}>
                              <FormActions form={form} onError={setError} />
                            </Suspense>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !listError &&
                    (section === "search" && query ? (
                      <div className="empty-workspace">
                        <Search size={30} strokeWidth={1.3} />
                        <h2>No results for “{query}”</h2>
                        <p>Try a different form name.</p>
                        <button className="button" type="button" onClick={() => setQuery("")}>
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="empty-workspace">
                        <div className="empty-form-paper">
                          <FileText size={42} strokeWidth={1.2} />
                        </div>
                        <h2>Create your first form</h2>
                        <p>
                          Start with a blank page. Type your questions,
                          <br />
                          then share your form with anyone.
                        </p>
                        <button
                          className="button primary"
                          type="button"
                          disabled={busy}
                          onClick={() => void create()}
                        >
                          <Plus size={15} />
                          New form
                        </button>
                      </div>
                    ))
                  )}
                  {nextCursor && (
                    <button
                      type="button"
                      className="button load-more"
                      disabled={loading}
                      onClick={() => void loadMore()}
                    >
                      {loading ? "Loading…" : "Load more forms"}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
function relativeDate(value: string) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const [amount, unit] =
    seconds < 3600
      ? [Math.floor(seconds / 60), "minute"]
      : seconds < 86400
        ? [Math.floor(seconds / 3600), "hour"]
        : [Math.floor(seconds / 86400), "day"];
  return `${amount} ${unit}${amount === 1 ? "" : "s"} ago`;
}

export function WorkspaceSidebar({
  user,
  section,
  select,
}: {
  user: { name: string; email: string };
  section?: Section;
  select: (section: Section) => void;
}) {
  return (
    <aside className="workspace-sidebar">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="workspace-name" type="button">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span>{user.name.split(" ")[0]}</span>
            <ChevronDown size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="account-summary">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <DropdownMenuItem onSelect={() => select("settings")}>
            <Settings size={15} />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void authClient.signOut()}>
            <LogOut size={15} />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <nav aria-label="Main navigation">
        {(
          [
            ["home", Home],
            ["search", Search],
            ["domains", Globe],
            ["settings", Settings],
            ["agents", Bot],
          ] as const
        ).map(([key, Icon]) => (
          <button
            type="button"
            key={key}
            className={`sidebar-item${section === key ? " active" : ""}`}
            aria-current={section === key ? "page" : undefined}
            onClick={() => select(key)}
          >
            <Icon size={16} strokeWidth={1.7} />
            {labels[key]}
          </button>
        ))}
      </nav>
      <div className="sidebar-section-label">Workspaces</div>
      <button
        type="button"
        className={`sidebar-item${section === "workspace" ? " active" : ""}`}
        onClick={() => select("workspace")}
      >
        <ChevronRight size={13} />
        <Folder size={15} />
        My workspace
      </button>
    </aside>
  );
}
