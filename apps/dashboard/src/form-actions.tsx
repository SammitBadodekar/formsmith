import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Download, ExternalLink, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import { api, type FormRecord, type FormSummary } from "./api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { cacheSavedForm, formQuery } from "./queries";

export default function FormActions({
  form,
  onError,
}: {
  form: FormSummary;
  onError: (message: string) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const original = await queryClient.fetchQuery({ ...formQuery(form.id), staleTime: 0 });
      const copy = await api<FormRecord>("/forms", {
        method: "POST",
        body: {
          definition: {
            ...original.draft,
            title: `${original.draft.title || "Untitled form"} (copy)`.slice(0, 500),
          },
        },
      });
      cacheSavedForm(queryClient, copy);
      await navigate({ to: "/forms/$formId", params: { formId: copy.id } });
    },
    onMutate: () => onError(""),
    onError: (error) => onError(error.message),
  });
  const busy = mutation.isPending;
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
        <DropdownMenuItem onSelect={() => mutation.mutate()}>
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
