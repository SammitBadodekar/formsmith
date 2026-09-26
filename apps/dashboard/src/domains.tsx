import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "./api";
import { PanelSkeleton } from "./loading";
import { resourceQuery } from "./queries";
import { useFormList } from "./use-form-list";

type Domain = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string | null;
  defaultFormId: string | null;
  lastError: string | null;
  records: { type: string; name: string; value: string }[];
};
export function Domains() {
  const [search, setSearch] = useState("");
  const { forms, nextCursor, loading, error: formError, loadMore } = useFormList(true, search);
  const [hostname, setHostname] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const client = useQueryClient();
  const options = resourceQuery<Domain[]>("/domains");
  const query = useQuery(options);
  const domains = query.data ?? [];
  const mutation = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => client.invalidateQueries({ queryKey: options.queryKey }),
  });
  const action = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError("");
    try {
      await mutation.mutateAsync(fn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Domain update failed");
    } finally {
      setBusy(null);
    }
  };
  if (query.isPending) return <PanelSkeleton label="Loading domains" />;
  return (
    <div className="domain-settings">
      <h1>Custom domains</h1>
      <p className="muted">
        Publish forms on your own domain. Add the DNS records below, then verify ownership.
      </p>
      <form
        className="domain-add"
        onSubmit={(e) => {
          e.preventDefault();
          void action("new", async () => {
            await api("/domains", { method: "POST", body: { hostname } });
            setHostname("");
          });
        }}
      >
        <label className="sr-only" htmlFor="domain-hostname">
          Domain hostname
        </label>
        <input
          id="domain-hostname"
          placeholder="forms.example.com"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          required
        />
        <button className="button primary" disabled={Boolean(busy)} type="submit">
          Connect domain
        </button>
      </form>
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
      {domains.length > 0 && (
        <label>
          Find a default form
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search form titles"
          />
        </label>
      )}
      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}
      {nextCursor && (
        <button type="button" className="button" disabled={loading} onClick={() => void loadMore()}>
          Load more forms
        </button>
      )}
      {domains.map((domain) => (
        <section className="domain-card" key={domain.id}>
          <header>
            <strong>{domain.hostname}</strong>
            <span className={`domain-status domain-${domain.status}`}>{domain.status}</span>
          </header>
          <dl>
            {domain.records.map((record) => (
              <div className="dns-record" key={`${record.type}:${record.name}:${record.value}`}>
                <dt>{record.type}</dt>
                <dd>
                  <span>{record.name}</span>
                  <code>{record.value}</code>
                </dd>
              </div>
            ))}
          </dl>
          <p className="muted">
            Use a DNS-only CNAME. Keep the TXT record in place. Root domains require DNS-provider
            support for CNAME flattening.
          </p>
          <label>
            Default form
            <select
              value={domain.defaultFormId ?? ""}
              disabled={Boolean(busy) || domain.status === "removing"}
              onChange={(e) =>
                void action(domain.id, () =>
                  api(`/domains/${domain.id}`, {
                    method: "PATCH",
                    body: { defaultFormId: e.target.value || null },
                  }),
                )
              }
            >
              <option value="">No default — use /f/form-id links</option>
              {domain.defaultFormId && !forms.some((form) => form.id === domain.defaultFormId) && (
                <option value={domain.defaultFormId}>Current form ({domain.defaultFormId})</option>
              )}
              {forms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.title || "Untitled form"}
                </option>
              ))}
            </select>
          </label>
          {domain.sslStatus && (
            <p className="muted">
              HTTPS:{" "}
              {domain.sslStatus === "managed_by_host" ? "Managed by your host" : domain.sslStatus}
            </p>
          )}
          {domain.lastError && <p className="error">{domain.lastError}</p>}
          <footer>
            <button
              className="button"
              type="button"
              disabled={Boolean(busy) || domain.status === "removing"}
              onClick={() =>
                void action(domain.id, () =>
                  api(`/domains/${domain.id}/verify`, { method: "POST", body: {} }),
                )
              }
            >
              {busy === domain.id ? "Checking…" : "Verify DNS"}
            </button>
            <button
              className="button subtle"
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void action(domain.id, () => api(`/domains/${domain.id}`, { method: "DELETE" }))
              }
            >
              Disconnect
            </button>
          </footer>
        </section>
      ))}
    </div>
  );
}
