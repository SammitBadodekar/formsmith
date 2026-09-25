import { useState } from "react";

export function ImageUpload({
  upload,
  onComplete,
  label = "Upload image",
}: {
  upload?: (file: File) => Promise<string>;
  onComplete: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="fe-image-upload">
      <label>
        {busy ? "Uploading…" : label}
        <input
          aria-label={label}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          disabled={!upload || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !upload) return;
            setBusy(true);
            setError("");
            try {
              if (file.size > 25 * 1024 * 1024) throw new Error("Images must be 25 MB or smaller");
              onComplete(await upload(file));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not upload image");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {!upload && <small>Save your form to upload images.</small>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
