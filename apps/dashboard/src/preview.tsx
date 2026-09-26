import type { FormDefinition } from "@formsmith/core";
import { FormRenderer } from "@formsmith/renderer";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function FormPreview({ form, close }: { form: FormDefinition; close: () => void }) {
  const [mobile, setMobile] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);
  const originFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    if (!frameDocument) return;
    // Use the same styles and renderer in a real viewport; phone media queries and vh units
    // must evaluate against the preview frame, not the desktop editor window.
    const styles = [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].map(
      (node) => node.cloneNode(true),
    );
    frameDocument.head.append(...styles);
    const style = frameDocument.createElement("style");
    style.textContent = "html,body{margin:0;min-height:100%;} .fs-renderer{min-height:100vh;}";
    frameDocument.head.append(style);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    frameDocument.addEventListener("keydown", handleEscape);
    return () => {
      styles.forEach((node) => {
        node.parentNode?.removeChild(node);
      });
      style.remove();
      frameDocument.removeEventListener("keydown", handleEscape);
    };
  }, [frameDocument, close]);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          className={`preview-overlay${mobile ? " mobile-preview" : ""}`}
          aria-describedby="preview-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            originFocus.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Form preview</Dialog.Title>
          <div className="preview-header">
            <Dialog.Close asChild>
              <button className="button" type="button">
                <ArrowLeft size={15} />
                Back to editor
              </button>
            </Dialog.Close>
            <div className="preview-controls">
              <div className="segmented-control">
                <button
                  type="button"
                  aria-label="Desktop preview"
                  aria-pressed={!mobile}
                  onClick={() => setMobile(false)}
                >
                  <Monitor size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Mobile preview"
                  aria-pressed={mobile}
                  onClick={() => setMobile(true)}
                >
                  <Smartphone size={16} />
                </button>
              </div>
              <button
                className="button subtle"
                type="button"
                aria-label="Restart preview"
                onClick={() => {
                  setAttempt((value) => value + 1);
                  frameDocument?.defaultView?.scrollTo(0, 0);
                }}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
          <Dialog.Description id="preview-description" className="preview-notice">
            Preview mode · Responses aren’t saved
          </Dialog.Description>
          <iframe
            title="Form preview viewport"
            className="preview-frame"
            onLoad={(event) => setFrameDocument(event.currentTarget.contentDocument)}
            srcDoc="<!doctype html><html lang='en'><head><meta name='viewport' content='width=device-width, initial-scale=1'></head><body></body></html>"
          />
          {frameDocument &&
            createPortal(
              <FormRenderer
                key={attempt}
                definition={form}
                onSubmit={async () => {}}
                upload={async (files) => files.map(() => crypto.randomUUID())}
              />,
              frameDocument.body,
            )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
