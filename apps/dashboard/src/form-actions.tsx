import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Download, ExternalLink, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import { useState } from "react";
import { api, type FormRecord, type FormSummary } from "./api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

export default function FormActions({
  form,
  onError,
}: {
  form: FormSummary;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    navigate = useNavigate();
  const duplicate = async () => {
    setBusy(true);
    onError("");
    try {
      const original = await api<FormRecord>(`/forms/${form.id}`);
      const copy = await api<FormRecord>("/forms", {
        method: "POST",
        body: {
          definition: {
            ...original.draft,
            title: `${original.draft.title || "Untitled form"} (copy)`.slice(0, 500),
          },
        },
      });
      await navigate({ to: "/forms/$formId", params: { formId: copy.id } });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not duplicate form");
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="icon-button"
          aria-label={`Actions for ${form.title || "Untitled form"}`}
          disabled={busy}
        >
          <MoreHorizontal size={19} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/forms/$formId" params={{ formId: form.id }}>
            <Pencil size={15} />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/forms/$formId" params={{ formId: form.id }} search={{ panel: "share" }}>
            <Share2 size={15} />
            Share
          </Link>
        </DropdownMenuItem>
        {form.publishedVersionId && (
          <DropdownMenuItem asChild>
            <a href={`/f/${form.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} />
              Open published form
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void duplicate()}>
          <Copy size={15} />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/forms/${form.id}/export?type=form`} download>
            <Download size={15} />
            Export form JSON
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
