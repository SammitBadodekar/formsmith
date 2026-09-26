import {
  type Answers,
  displayAnswer,
  type FormDefinition,
  plainText,
  questions,
} from "@formsmith/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PanelSkeleton } from "./loading";
import { resourceQuery } from "./queries";

export type ResponseRow = {
  id: string;
  formId: string;
  versionId: string;
  receivedAt: string;
  answers: Answers;
};
export function ResponseDetails({ row }: { row: ResponseRow }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    ...resourceQuery<{ definition: FormDefinition }>(
      `/forms/${row.formId}/versions/${row.versionId}`,
    ),
    enabled: open,
    staleTime: Infinity, // Published definitions are immutable and shared by many responses.
  });
  const definition = query.data?.definition;
  const error = query.error?.message;
  return (
    <details
      className="response"
      onToggle={(e) => {
        setOpen(e.currentTarget.open);
      }}
    >
      <summary>{new Date(row.receivedAt).toLocaleString()}</summary>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button type="button" className="text-link" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {open && query.isPending && <PanelSkeleton label="Loading response" />}
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
