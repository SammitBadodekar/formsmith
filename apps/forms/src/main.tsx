import "@fontsource-variable/inter";
import "@formsmith/renderer/styles.css";
import "./styles.css";
import {
  type Answers,
  answersSchema,
  type FormDefinition,
  formSchema,
  type Receipt,
  type SubmissionCommand,
  submissionSchema,
} from "@formsmith/core";
import { FormRenderer } from "@formsmith/renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type Attempt = {
  definition: FormDefinition;
  token: string;
  versionId: string;
  attemptId: string;
  expiresAt: number;
};
type Saved = { attempt: Attempt; answers: Answers; command?: SubmissionCommand; receipt?: Receipt };
const intake = import.meta.env.VITE_INTAKE_URL ?? "/intake";
async function request<T>(path: string, token?: string, data?: unknown): Promise<T> {
  const response = await fetch(`${intake}${path}`, {
    method: data === undefined ? "GET" : "POST",
    credentials: "omit",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(data !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Unable to reach the form. Please try again.");
  return result as T;
}
function PublicForm() {
  const formId = /^\/f\/([a-zA-Z0-9_-]+)\/?$/.exec(location.pathname)?.[1];
  const [attempt, setAttempt] = useState<Attempt | null>(null),
    [initial, setInitial] = useState<Answers>({}),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [expired, setExpired] = useState(false),
    [retrying, setRetrying] = useState(false);
  const state = useRef<Saved | null>(null),
    honeypot = useRef<HTMLInputElement>(null);
  const key = `formsmith:attempt:${formId ?? location.hostname}`;
  const persist = useCallback(() => {
    const saved = state.current;
    if (!saved) return;
    try {
      if (saved.receipt?.status === "committed") {
        saved.answers = saved.command?.answers ?? saved.answers;
        delete saved.command;
        localStorage.removeItem(key);
      }
      sessionStorage.setItem(key, JSON.stringify(saved));
      if (
        saved.receipt?.status !== "committed" &&
        (saved.attempt.definition.settings.resume || saved.command)
      )
        localStorage.setItem(key, JSON.stringify(saved));
    } catch {
      /* Network receipt is authoritative when browser storage is unavailable. */
    }
  }, [key]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let saved: Saved | undefined;
        try {
          const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
          if (raw) {
            const candidate = JSON.parse(raw) as Saved;
            formSchema.parse(candidate.attempt.definition);
            candidate.answers = answersSchema.parse(candidate.answers);
            if (candidate.command) submissionSchema.parse(candidate.command);
            if (candidate.attempt.definition.id === formId || !formId) saved = candidate;
          }
        } catch {
          /* Invalid or obsolete local state must not prevent opening a form. */
        }
        if (saved) {
          if (!saved.command && !saved.receipt && saved.attempt.expiresAt <= Date.now()) {
            if (!cancelled) {
              setExpired(true);
              setError("This form session has expired. Start a new response to continue.");
            }
            return;
          }
          const resumed = await request<Omit<Attempt, "token">>("/attempt", saved.attempt.token);
          saved.attempt = { ...resumed, token: saved.attempt.token };
        } else {
          const route = formId
            ? `/forms/${encodeURIComponent(formId)}/attempts`
            : "/domain/attempts";
          const fresh = await request<Attempt>(route, undefined, {});
          const params = new URLSearchParams(location.search),
            answers: Answers = {};
          for (const h of fresh.definition.hiddenFields) {
            const value = params.get(h.name);
            if (value !== null) answers[h.id] = value;
          }
          saved = { attempt: fresh, answers };
        }
        if (cancelled) return;
        state.current = saved;
        setAttempt(saved.attempt);
        setInitial(saved.answers);
        setReceipt(saved.receipt ?? null);
        setPending(Boolean(saved.command && !saved.receipt));
        document.title = saved.attempt.definition.title || "Formsmith";
        persist();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Form unavailable");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [formId, key, persist]);
  useEffect(() => {
    if (receipt?.status !== "pending" || !attempt) return;
    let active = true;
    const timer = setInterval(() => {
      request<Receipt>("/receipt", attempt.token)
        .then((next) => {
          if (active) {
            setReceipt(next);
            if (state.current) {
              state.current.receipt = next;
              persist();
            }
          }
        })
        .catch(() => {});
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [receipt?.status, attempt, persist]);
  useEffect(() => {
    if (window.parent === window) return;
    const content = document.getElementById("root");
    if (!content) return;
    let lastHeight = 0;
    const observer = new ResizeObserver(() => {
      // Document scrollHeight includes the iframe's current viewport, which
      // prevents a long page from shrinking after navigation or submission.
      const height = Math.ceil(content.getBoundingClientRect().height);
      if (height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({ type: "formsmith:resize", height }, "*");
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  const send = async () => {
    const saved = state.current;
    if (!saved?.command) return;
    setRetrying(true);
    setError("");
    try {
      const result = await request<Receipt>("/submissions", saved.attempt.token, saved.command);
      saved.receipt = result;
      setReceipt(result);
      setPending(false);
      persist();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The result is unknown. Retry to check it safely.");
      setPending(true);
      throw e;
    } finally {
      setRetrying(false);
    }
  };
  if (receipt && attempt)
    return (
      <FormRenderer
        key={`receipt:${attempt.attemptId}`}
        definition={attempt.definition}
        initialAnswers={state.current?.command?.answers ?? state.current?.answers ?? initial}
        receipt={receipt}
        onSubmit={async () => {}}
      />
    );
  if (pending)
    return (
      <main className="result-page">
        <h1>Check your submission</h1>
        <p>
          The last request did not return a confirmed result. Your answers are saved here. Retry to
          safely check the same submission.
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="button" disabled={retrying} onClick={() => void send().catch(() => {})}>
          {retrying ? "Checking…" : "Retry submission"}
        </button>
      </main>
    );
  if (!attempt)
    return (
      <main className="result-page" role="status">
        {error || "Loading form…"}
        {error && (
          <button
            type="button"
            onClick={() => {
              if (expired) {
                try {
                  sessionStorage.removeItem(key);
                  localStorage.removeItem(key);
                } catch {}
              }
              location.reload();
            }}
          >
            {expired ? "Start a new response" : "Try again"}
          </button>
        )}
      </main>
    );
  return (
    <>
      <div className="honeypot" aria-hidden="true">
        <label>
          Leave this field empty
          <input ref={honeypot} tabIndex={-1} autoComplete="off" name="website_confirmation" />
        </label>
      </div>
      <FormRenderer
        definition={attempt.definition}
        initialAnswers={initial}
        onAnswersChange={(answers) => {
          if (state.current) {
            state.current.answers = answers;
            persist();
          }
        }}
        onSubmit={async (answers) => {
          if (!state.current) return;
          state.current.command ??= {
            formId: attempt.definition.id,
            versionId: attempt.versionId,
            attemptId: attempt.attemptId,
            answers,
            honeypot: honeypot.current?.value ?? "",
          };
          persist();
          await send();
        }}
        upload={async (files, question) => {
          const ids: string[] = [];
          for (const file of files) {
            const prepare = await fetch("/api/uploads/prepare", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${attempt.token}`,
              },
              body: JSON.stringify({
                questionId: question.id,
                fileName: file.name,
                contentType: file.type || "application/octet-stream",
                bytes: file.size,
              }),
            });
            if (!prepare.ok) throw new Error("Could not prepare upload");
            const target = (await prepare.json()) as {
              id: string;
              url: string;
              headers: Record<string, string>;
            };
            const uploaded = await fetch(target.url, {
              method: "PUT",
              headers: target.headers,
              body: file,
            });
            if (!uploaded.ok && uploaded.status !== 412) throw new Error("Upload failed");
            const done = await fetch(`/api/uploads/${target.id}/complete`, {
              method: "POST",
              headers: { authorization: `Bearer ${attempt.token}` },
            });
            if (!done.ok) throw new Error("Upload verification failed");
            ids.push(target.id);
          }
          return ids;
        }}
      />
    </>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
createRoot(root).render(<PublicForm />);
