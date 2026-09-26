import { safeUrl } from "@formsmith/core";
import { ImageUpload } from "@formsmith/editor";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";

export function MediaPicker({
  kind,
  value,
  upload,
  change,
  close,
}: {
  kind: "logo" | "cover";
  value: string;
  upload?: (file: File) => Promise<string>;
  change: (url: string) => void;
  close: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [url, setUrl] = useState(value);
  const [error, setError] = useState("");
  const apply = (url: string) => {
    change(url);
    close();
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="media-scrim" />
        <Dialog.Content className="media-picker" aria-describedby={undefined}>
          <header>
            <Dialog.Title>{kind === "logo" ? "Form logo" : "Cover image"}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="icon-button" aria-label="Close image picker">
                <X size={17} />
              </button>
            </Dialog.Close>
          </header>
          <div className="media-tabs">
            <button type="button" aria-pressed={tab === "upload"} onClick={() => setTab("upload")}>
              Upload
            </button>
            <button type="button" aria-pressed={tab === "link"} onClick={() => setTab("link")}>
              Link
            </button>
          </div>
          {tab === "upload" ? (
            <ImageUpload label={`Upload ${kind}`} upload={upload} onComplete={apply} />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!safeUrl(url))
                  return setError("Enter a valid image URL starting with https:// or http://.");
                apply(url.trim());
              }}
            >
              <label>
                Image URL
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  required
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="button primary">
                Add image
              </button>
            </form>
          )}
          <p className="muted">
            {kind === "logo"
              ? "Recommended size: 200 × 200 pixels."
              : "Use a wide image, at least 1500 pixels across."}
          </p>
          {value && (
            <button type="button" className="button subtle" onClick={() => apply("")}>
              Remove {kind}
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
