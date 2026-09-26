import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, authClient } from "./api";
import { PanelSkeleton } from "./loading";

const permissions: Record<string, string> = {
  "forms:read": "Read your forms and their configuration",
  "forms:write": "Create and edit your forms",
  "forms:publish": "Publish, close and reopen your forms",
  "submissions:read": "Read and export responses",
  "integrations:write": "Manage connectors and retry deliveries",
  "domains:read": "Read custom domains and their verification status",
  "domains:write": "Connect, verify, configure and disconnect custom domains",
  openid: "Identify your account",
  profile: "Read your name and profile image",
  email: "Read your email address",
  offline_access: "Stay connected until you revoke access",
};
const machineScopes = Object.keys(permissions).filter((scope) => scope.includes(":"));
type Credential = {
  id: string;
  name: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
};
type Consent = { id: string; clientId: string; scopes: string[] };

export function AgentAccess() {
  const [name, setName] = useState("");
  const [days, setDays] = useState(30);
  const [scopes, setScopes] = useState(["forms:read"]);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const client = useQueryClient();
  const queryKey = ["agent-access"];
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const [tokens, grants] = await Promise.all([
        api<Credential[]>("/credentials", { signal }),
        authClient.oauth2.getConsents(),
      ]);
      if (grants.error) throw new Error(grants.error.message);
      return { credentials: tokens, consents: (grants.data ?? []) as Consent[] };
    },
  });
  const { credentials = [], consents = [] } = query.data ?? {};
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  const busy = mutation.isPending;
  const perform = async (action: () => Promise<unknown>) => {
    setError("");
    try {
      await mutation.mutateAsync(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update access");
    }
  };
  if (query.isPending) return <PanelSkeleton label="Loading agent access" />;
  return (
    <section className="access-settings">
      <h1>Agents & API</h1>
      <p>Connect an agent with OAuth, or create a scoped credential for your own automation.</p>
      <label>
        MCP server URL
        <input readOnly value={`${location.origin}/api/mcp`} />
      </label>
      <p>
        Use this URL in your client's remote MCP settings. You’ll sign in with Google and choose
        whether to grant access.
      </p>
      {(error || query.error) && (
        <p className="error" role="alert">
          {error || query.error?.message}
          {query.error && (
            <button type="button" className="text-link" onClick={() => void query.refetch()}>
              Try again
            </button>
          )}
        </p>
      )}
      <h2>Connected applications</h2>
      {!consents.length && <p>No applications connected yet.</p>}
      {consents.map((consent) => (
        <article className="access-card" key={consent.id}>
          <strong>{consent.clientId}</strong>
          <ul>
            {consent.scopes.map((scope) => (
              <li key={scope}>{permissions[scope] ?? scope}</li>
            ))}
          </ul>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await api(`/connections/${encodeURIComponent(consent.id)}`, { method: "DELETE" });
              })
            }
          >
            Disconnect
          </button>
        </article>
      ))}
      <h2>Machine credentials</h2>
      <form
        className="access-card"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            const result = await api<{ token: string }>("/credentials", {
              method: "POST",
              body: { name, scopes, days },
            });
            setSecret(result.token);
            setName("");
          });
        }}
      >
        <label>
          Name
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My automation"
          />
        </label>
        <fieldset>
          <legend>Permissions</legend>
          {machineScopes.map((scope) => (
            <label className="check-label" key={scope}>
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={(e) =>
                  setScopes(
                    e.target.checked ? [...scopes, scope] : scopes.filter((s) => s !== scope),
                  )
                }
              />
              {permissions[scope]}
            </label>
          ))}
        </fieldset>
        <label>
          Expires after
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </label>
        <button type="submit" className="button primary" disabled={busy || !scopes.length}>
          Create credential
        </button>
      </form>
      {secret && (
        <div className="access-card" role="status">
          <strong>Copy your credential now</strong>
          <p>It’s shown only once. Send it as a Bearer token to the API or MCP endpoint.</p>
          <input aria-label="New machine credential" readOnly value={secret} />
          <div className="action-row">
            <button
              type="button"
              className="button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(secret)
                  .catch(() => setError("Select and copy the credential manually."))
              }
            >
              Copy credential
            </button>
            <button type="button" className="button" onClick={() => setSecret("")}>
              Done
            </button>
          </div>
        </div>
      )}
      {credentials.map((credential) => (
        <article className="access-card" key={credential.id}>
          <strong>{credential.name}</strong>
          <p>
            {credential.revokedAt
              ? "Revoked"
              : new Date(credential.expiresAt) <= new Date()
                ? "Expired"
                : `Expires ${new Date(credential.expiresAt).toLocaleDateString()}`}
          </p>
          <ul>
            {credential.scopes.map((scope) => (
              <li key={scope}>{permissions[scope] ?? scope}</li>
            ))}
          </ul>
          {!credential.revokedAt && (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() =>
                void perform(() => api(`/credentials/${credential.id}`, { method: "DELETE" }))
              }
            >
              Revoke credential
            </button>
          )}
        </article>
      ))}
    </section>
  );
}

export function ConsentPage() {
  const { data: session, isPending } = authClient.useSession();
  const [client, setClient] = useState<{ name: string; id: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const query = new URLSearchParams(location.search),
    clientId = query.get("client_id") ?? "";
  const scopes = [...new Set((query.get("scope") ?? "").split(" ").filter(Boolean))];
  let claims: Record<string, unknown> | undefined;
  let invalidClaims = false;
  try {
    const value: unknown = JSON.parse(query.get("claims") ?? "null");
    if (value !== null) {
      if (typeof value !== "object" || Array.isArray(value)) invalidClaims = true;
      else claims = value as Record<string, unknown>;
    }
  } catch {
    invalidClaims = true;
  }
  const userinfo = claims?.userinfo;
  const claimNames =
    userinfo && typeof userinfo === "object" && !Array.isArray(userinfo)
      ? Object.keys(userinfo)
      : [];
  useEffect(() => {
    if (!session || !clientId) return;
    let active = true;
    void authClient.oauth2
      .publicClient({ query: { client_id: clientId } })
      .then((result) => {
        if (!active) return;
        if (result.error) setError(result.error.message ?? "Unknown application");
        else setClient({ name: result.data.client_name ?? "Application", id: clientId });
      })
      .catch(() => {
        if (active) setError("Could not load the requesting application");
      });
    return () => {
      active = false;
    };
  }, [session, clientId]);
  const decide = async (accept: boolean) => {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.oauth2.consent({ accept, scope: scopes.join(" "), claims });
      if (result.error) throw new Error(result.error.message);
      const destination = result.data?.url;
      if (!destination) throw new Error("Authorization did not return a destination");
      // Only the server-validated registered redirect is used, never redirect_uri from the URL.
      location.assign(destination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not authorize application");
      setBusy(false);
    }
  };
  if (isPending)
    return (
      <main className="message-page" role="status">
        Loading…
      </main>
    );
  if (!session)
    return (
      <main className="consent-page">
        <h1>Sign in to connect your agent</h1>
        <a className="button primary" href={`/login${location.search}`}>
          Continue to sign in
        </a>
      </main>
    );
  return (
    <main className="consent-page">
      <span className="wordmark">formsmith</span>
      <h1>Connect {client?.name ?? "application"}?</h1>
      <p>Signed in as {session.user.email}</p>
      <p className="client-identity">Application ID: {clientId || "Missing"}</p>
      <ul>
        {scopes.map((scope) => (
          <li key={scope}>{permissions[scope] ?? `Requested permission: ${scope}`}</li>
        ))}
        {claimNames.map((name) => (
          <li key={`claim:${name}`}>Read account attribute: {name}</li>
        ))}
      </ul>
      <p>You can disconnect this application in Agents & API.</p>
      {(error || invalidClaims) && (
        <p className="error" role="alert">
          {error || "Invalid authorization request"}
        </p>
      )}
      <div className="action-row">
        <button
          className="button"
          type="button"
          disabled={busy || !client}
          onClick={() => void decide(false)}
        >
          Cancel
        </button>
        <button
          className="button primary"
          type="button"
          disabled={busy || !client || invalidClaims}
          onClick={() => void decide(true)}
        >
          Allow access
        </button>
      </div>
    </main>
  );
}
