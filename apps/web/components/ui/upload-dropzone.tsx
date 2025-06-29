"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import type { UploadHookControl } from "better-upload/client";
import { Loader2, Upload } from "lucide-react";
import { useId, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  control: UploadHookControl<false>;
  accept?: string;
  metadata?: Record<string, unknown>;
  uploadOverride?: (
    ...args: Parameters<UploadHookControl<false>["upload"]>
  ) => void;
  maxSize?: string;
  recommendedDimensions?: string;
};

export function UploadDropzone({
  control: { upload, isPending },
  accept,
  metadata,
  uploadOverride,
  maxSize = "10 MB",
  recommendedDimensions = "minimum 1500 pixels wide",
}: UploadDropzoneProps) {
  const id = useId();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (uploadOverride) {
        uploadOverride(file, { metadata });
      } else {
        upload(file, { metadata });
      }
    },
    [upload, uploadOverride, metadata],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && !isPending) {
        handleFile(files[0]);
      }
    },
    [handleFile, isPending],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && !isPending) {
        handleFile(e.target.files[0]);
      }
      e.target.value = "";
    },
    [handleFile, isPending],
  );

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center transition-colors",
        "focus-within:border-blue-500 hover:border-gray-400",
        isDragOver && "border-blue-500 bg-blue-50",
        isPending && "pointer-events-none opacity-50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={isPending}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />

      <div className="flex flex-col items-center space-y-4">
        {isPending ? (
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        ) : (
          <Upload className="h-12 w-12 text-gray-400" />
        )}

        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            {isPending ? "Uploading..." : "Click to choose a file or drag here"}
          </p>

          <div className="space-y-1 text-sm text-gray-500">
            <p>Recommended dimensions: {recommendedDimensions}</p>
            <p>Size limit: {maxSize}</p>
          </div>
        </div>

        {!isPending && (
          <Button
            type="button"
            variant="outline"
            className="mt-4 bg-transparent"
            onClick={() => document.getElementById(id)?.click()}
          >
            Browse Files
          </Button>
        )}
      </div>
    </div>
  );
}
