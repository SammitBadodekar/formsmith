import {
  type Answers,
  displayAnswer,
  type FormDefinition,
  plainText,
  questions,
} from "@formsmith/core";
import { useState } from "react";
import { api } from "./api";

export type ResponseRow = {
  id: string;
  formId: string;
  versionId: string;
  receivedAt: string;
  answers: Answers;
};
export function ResponseDetails({ row }: { row: ResponseRow }) {
  const [definition, setDefinition] = useState<FormDefinition | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (definition || loading) return;
    setLoading(true);
    setError("");
    try {
      setDefinition(
        (
          await api<{ definition: FormDefinition }>(
            `/forms/${row.formId}/versions/${row.versionId}`,
          )
        ).definition,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load question labels");
    } finally {
      setLoading(false);
    }
  };
  return (
    <details
      className="response"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary>{new Date(row.receivedAt).toLocaleString()}</summary>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button type="button" className="text-link" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      {loading && <p role="status">Loading response…</p>}
      {definition && (
        <dl className="response-fields">
          {Object.entries(row.answers).map(([id, value]) => {
            const question = questions(definition).find((q) => q.id === id);
            const label = question
              ? plainText(question.label)
              : (definition.hiddenFields.find((h) => h.id === id)?.name ??
                definition.calculations.find((c) => c.id === id)?.name ??
                id);
            return (
              <div key={id}>
                <dt>{label || "Untitled question"}</dt>
                <dd>
                  {question?.type === "file" && Array.isArray(value) ? (
                    value.map((fileId, i) => (
                      <a key={fileId} href={`/api/uploads/${encodeURIComponent(fileId)}/download`}>
                        Download file {i + 1}
                      </a>
                    ))
                  ) : question?.type === "signature" &&
                    typeof value === "string" &&
                    value.startsWith("data:image/png;base64,") ? (
                    <img src={value} alt="Submitted signature" />
                  ) : typeof value === "boolean" ? (
                    value ? (
                      "Yes"
                    ) : (
                      "No"
                    )
                  ) : (
                    displayAnswer(definition, id, row.answers)
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      <small className="muted">
        Response {row.id} · Version {row.versionId}
      </small>
    </details>
  );
}
