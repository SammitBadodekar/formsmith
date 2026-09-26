import { useEffect, useState } from "react";
import { api, authClient } from "./api";
import { PanelSkeleton } from "./loading";

type Connector = {
  id: string;
  kind: "webhook" | "sheets";
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  recentDeliveries: {
    id: string;
    attempts: number;
    completedAt: string | null;
    failedAt: string | null;
    lastError: string | null;
    createdAt: string;
  }[];
};
export function Connectors({ formId }: { formId: string }) {
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [spreadsheet, setSpreadsheet] = useState("");
  const endpoint = `/forms/${formId}/integrations`;
  const refresh = async () => setConnectors(await api<Connector[]>(endpoint));
  useEffect(() => {
    let active = true;
    const load = () =>
      api<Connector[]>(endpoint)
        .then((rows) => {
          if (active) {
            setConnectors(rows);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setLoading(false);
          }
        });
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [endpoint]);
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update connector");
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <PanelSkeleton label="Loading integrations" />;
  return (
    <div className="connector-settings">
      <p>
        Send new responses to your tools. Failed deliveries retry automatically; responses remain
        saved in Formsmith.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="access-card">
        <h3>Google Sheets</h3>
        <p>
          Grant Sheets access, then paste a spreadsheet URL. Formsmith creates a dedicated tab for
          this form’s responses.
        </p>
        <button
          className="button"
          type="button"
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              const result = await authClient.linkSocial({
                provider: "google",
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
                callbackURL: `/forms/${formId}?panel=connectors`,
              });
              if (result.error) throw new Error(result.error.message);
            })
          }
        >
          Connect Google account
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () => {
              const spreadsheetId =
                spreadsheet
                  .trim()
                  .match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/)?.[1] ??
                spreadsheet.trim();
              await api(endpoint, { method: "POST", body: { kind: "sheets", spreadsheetId } });
              setSpreadsheet("");
            });
          }}
        >
          <label>
            Spreadsheet URL or ID
            <input
              required
              value={spreadsheet}
              maxLength={1000}
              onChange={(e) => setSpreadsheet(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
            />
          </label>
          <button className="button primary" type="submit" disabled={busy}>
            Add spreadsheet
          </button>
        </form>
      </section>
      <form
        className="access-card"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            const result = await api<{ secret: string }>(endpoint, {
              method: "POST",
              body: { kind: "webhook", name, url },
            });
            setSecret(result.secret);
            setName("");
            setUrl("");
          });
        }}
      >
        <h3>Outgoing webhook</h3>
        <label>
          Name
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My app"
          />
        </label>
        <label>
          Endpoint URL
          <input
            type="url"
            required
            maxLength={2000}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/formsmith"
          />
        </label>
        <button className="button primary" type="submit" disabled={busy}>
          Add webhook
        </button>
      </form>
      {secret && (
        <div className="access-card" role="status">
          <strong>Save your webhook signing secret</strong>
          <p>This secret is shown once.</p>
          <input aria-label="Webhook signing secret" readOnly value={secret} />
          <div className="action-row">
            <button
              className="button"
              type="button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(secret)
                  .catch(() => setError("Select and copy the secret manually."))
              }
            >
              Copy secret
            </button>
            <button className="button" type="button" onClick={() => setSecret("")}>
              Done
            </button>
          </div>
        </div>
      )}
      {connectors.map((connector) => (
        <section className="access-card" key={connector.id}>
          <h3>{connector.name}</h3>
          <p>
            {connector.kind === "webhook"
              ? String(connector.config.url ?? "")
              : `Spreadsheet: ${String(connector.config.spreadsheetId ?? "")}`}
          </p>
          {connector.kind === "sheets" && (
            <p>
              Keep the connector tab’s rows and columns in place. Use a separate tab for sorting and
              analysis.
            </p>
          )}
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() =>
              void perform(() =>
                api(`${endpoint}/${connector.id}`, {
                  method: "PATCH",
                  body: { enabled: !connector.enabled },
                }),
              )
            }
          >
            {connector.enabled ? "Pause connector" : "Enable connector"}
          </button>
          <h4>Recent deliveries</h4>
          {!connector.recentDeliveries.length && (
            <p>No deliveries yet. New responses will appear here.</p>
          )}
          {connector.recentDeliveries.map((delivery) => (
            <div className="delivery-row" key={delivery.id}>
              <span>
                {delivery.completedAt
                  ? "Delivered"
                  : delivery.failedAt
                    ? "Needs attention"
                    : delivery.attempts
                      ? "Retrying"
                      : "Pending"}{" "}
                · {new Date(delivery.createdAt).toLocaleString()}
              </span>
              {delivery.lastError && <p>{delivery.lastError}</p>}
              {delivery.failedAt && (
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void perform(() =>
                      api(`${endpoint}/${connector.id}/retry/${delivery.id}`, { method: "POST" }),
                    )
                  }
                >
                  Retry delivery
                </button>
              )}
            </div>
          ))}
        </section>
      ))}
      <details className="access-card">
        <summary>Webhook delivery format</summary>
        <p>
          Requests are JSON with id, type, createdAt and data containing formId, versionId,
          attemptId, answers and fields. Deduplicate using the id.
        </p>
        <p>
          Verify webhook-signature as v1, followed by Base64 HMAC-SHA256 of{" "}
          <code>webhook-id.webhook-timestamp.rawBody</code> using your signing secret. Reject stale
          timestamps and compare signatures in constant time.
        </p>
        <p>
          Return a 2xx response within 10 seconds. Deliveries retry with the same event ID; ordering
          is not guaranteed.
        </p>
      </details>
    </div>
  );
}
