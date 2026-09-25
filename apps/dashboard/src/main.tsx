import "@fontsource-variable/inter";
import "./styles.css";
import { type FormDefinition, formSchema } from "@formsmith/core";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  FileText,
  Folder,
  Globe,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { AgentAccess, ConsentPage } from "./agent-access";
import { api, authClient, type FormRecord } from "./api";
import { Domains } from "./domains";
import { useFormList } from "./use-form-list";

const Builder = lazy(() => import("./builder"));
const FormActions = lazy(() => import("./form-actions"));

const rootRoute = createRootRoute({
  component: () => (
    <Suspense
      fallback={
        <main className="message-page" role="status">
          Loading…
        </main>
      }
    >
      <Outlet />
    </Suspense>
  ),
  notFoundComponent: () => (
    <main className="message-page">
      <h1>Page not found</h1>
      <Link to="/">Back to workspace</Link>
    </main>
  ),
});
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Dashboard });
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});
const consentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/consent",
  component: ConsentPage,
});
const createRoutePage = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  component: () => <Builder key="new" />,
});
const builderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forms/$formId",
  validateSearch: (search: Record<string, unknown>): { panel?: "share" | "connectors" } => ({
    panel: search.panel === "share" || search.panel === "connectors" ? search.panel : undefined,
  }),
  component: () => {
    const { formId } = builderRoute.useParams();
    return <Builder key={formId} id={formId} />;
  },
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    loginRoute,
    consentRoute,
    createRoutePage,
    builderRoute,
  ]),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function Login() {
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <Link to="/" className="wordmark">
        formsmith
      </Link>
      <div>
        <h1>Welcome to Formsmith</h1>
        <p>Create forms that feel like a document.</p>
        <button
          className="google-button"
          type="button"
          onClick={async () => {
            let hasDraft = false;
            try {
              hasDraft = Boolean(localStorage.getItem("formsmith:draft"));
            } catch {}
            const result = await authClient.signIn.social({
              provider: "google",
              callbackURL: hasDraft ? "/create" : "/",
            });
            if (result.error) setError(result.error.message ?? "Sign in failed");
          }}
        >
          <span className="google-mark">G</span>Continue with Google
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Link to="/create" className="text-link">
          Try the builder first →
        </Link>
      </div>
    </main>
  );
}
function Dashboard() {
  const [section, setSection] = useState<"forms" | "domains" | "agents">("forms");
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const {
    forms,
    nextCursor,
    loading,
    error: listError,
    loadMore,
  } = useFormList(Boolean(session), query);
  if (isPending)
    return (
      <main className="message-page" role="status">
        Loading your workspace…
      </main>
    );
  if (!session) return <Login />;
  const create = async (definition?: FormDefinition) => {
    setBusy(true);
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
    <div className="dashboard">
      <aside className="workspace-sidebar">
        <Link to="/" className="workspace-name">
          <span className="avatar">{session.user.name.slice(0, 1).toUpperCase()}</span>
          {session.user.name.split(" ")[0]}'s workspace
          <ChevronDown size={14} />
        </Link>
        <label className="search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search forms"
          />
        </label>
        <button
          type="button"
          className={`sidebar-item ${section === "forms" ? "active" : ""}`}
          onClick={() => setSection("forms")}
        >
          <Folder size={16} />
          My workspace
        </button>
        <button
          type="button"
          className={`sidebar-item ${section === "domains" ? "active" : ""}`}
          onClick={() => setSection("domains")}
        >
          <Globe size={16} />
          Custom domains
        </button>
        <button type="button" className="sidebar-item" onClick={() => void authClient.signOut()}>
          <Settings size={16} />
          Sign out
        </button>
        <button
          type="button"
          className={`sidebar-item ${section === "agents" ? "active" : ""}`}
          onClick={() => setSection("agents")}
        >
          <Bot size={16} />
          Agents & API
        </button>
        <div className="sidebar-bottom">
          <span className="wordmark">formsmith</span>
          <span>Open source · MIT</span>
        </div>
      </aside>
      <main className="workspace-main">
        {section === "agents" ? (
          <AgentAccess />
        ) : section === "domains" ? (
          <Domains />
        ) : (
          <>
            <div className="workspace-heading">
              <h1>My workspace</h1>
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={() => void create()}
              >
                <Plus size={16} />
                Create form
              </button>
            </div>
            {(error || listError) && (
              <p className="error" role="alert">
                {error || listError}
              </p>
            )}
            <div className="workspace-toolbar">
              <span>
                {forms.length}
                {nextCursor ? "+" : ""} {forms.length === 1 ? "form" : "forms"}
              </span>
              <label className="import-button">
                Import form
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 1024 * 1024) throw new Error("Form file is too large");
                      await create(formSchema.parse(JSON.parse(await file.text())));
                    } catch (error) {
                      setError(error instanceof Error ? error.message : "Invalid form file");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {forms.length ? (
              <div className="form-list">
                {forms.map((form) => (
                  <div className="form-row" key={form.id}>
                    <Link
                      className="form-row-main"
                      to="/forms/$formId"
                      params={{ formId: form.id }}
                    >
                      <FileText size={19} />
                      <div>
                        <strong>{form.title || "Untitled form"}</strong>
                        <span>
                          {form.publishedVersionId
                            ? form.closed
                              ? "Closed"
                              : "Published"
                            : "Draft"}{" "}
                          · Edited {new Date(form.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                    <Suspense fallback={<span className="icon-button" aria-hidden="true" />}>
                      <FormActions form={form} onError={setError} />
                    </Suspense>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <p role="status">Loading forms…</p>
            ) : query ? (
              <p className="muted">No forms match “{query}”.</p>
            ) : (
              <div className="empty-workspace">
                <FileText size={32} strokeWidth={1.4} />
                <h2>Your next form starts here</h2>
                <p>Just start typing. Add questions as you go.</p>
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => void create()}
                >
                  Create your first form <ArrowUpRight size={16} />
                </button>
              </div>
            )}
            {nextCursor && (
              <button
                type="button"
                className="button"
                disabled={loading}
                onClick={() => void loadMore()}
              >
                {loading ? "Loading…" : "Load more forms"}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
createRoot(root).render(<RouterProvider router={router} />);
