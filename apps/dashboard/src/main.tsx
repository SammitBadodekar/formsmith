import "@fontsource-variable/inter";
import "./styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { authClient } from "./api";
import { Dashboard } from "./dashboard";
import { BuilderSkeleton, WorkspaceSkeleton } from "./loading";
import { createQueryClient } from "./queries";

const Builder = lazy(() => import("./builder"));
const ConsentPage = lazy(() =>
  import("./agent-access").then((module) => ({ default: module.ConsentPage })),
);

const rootRoute = createRootRoute({
  component: () => (
    <Suspense
      fallback={
        location.pathname.startsWith("/forms/") || location.pathname === "/create" ? (
          <BuilderSkeleton />
        ) : (
          <WorkspaceSkeleton />
        )
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
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>): { section?: string } => ({
    section: typeof search.section === "string" ? search.section : undefined,
  }),
  component: () => {
    const { section } = homeRoute.useSearch();
    return <Dashboard key={section} login={<Login />} />;
  },
});
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
  validateSearch: (
    search: Record<string, unknown>,
  ): { panel?: "share" | "connectors" | "responses" | "settings" } => ({
    panel:
      search.panel === "share" ||
      search.panel === "connectors" ||
      search.panel === "responses" ||
      search.panel === "settings"
        ? search.panel
        : undefined,
  }),
  component: () => {
    const { formId } = builderRoute.useParams();
    const { panel } = builderRoute.useSearch();
    return <Builder key={formId} id={formId} requestedPanel={panel} />;
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
const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
function SessionApp() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending)
    return location.pathname.startsWith("/forms/") || location.pathname === "/create" ? (
      <BuilderSkeleton />
    ) : (
      <WorkspaceSkeleton />
    );
  return <QueryApp key={session?.user.id ?? "anonymous"} />;
}
function QueryApp() {
  // A fresh client per authenticated owner prevents cached private data crossing accounts.
  const [client] = useState(createQueryClient);
  useEffect(() => () => client.clear(), [client]);
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
createRoot(root).render(<SessionApp />);
