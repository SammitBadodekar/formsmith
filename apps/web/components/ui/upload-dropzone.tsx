"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { useId, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  onFileSelect: (file: File) => void | Promise<void>;
  isUploading?: boolean;
  accept?: string;
  maxSize?: string;
  recommendedDimensions?: string;
};

export function UploadDropzone({
  onFileSelect,
  isUploading = false,
  accept,
  maxSize = "10 MB",
  recommendedDimensions = "minimum 1500 pixels wide",
}: UploadDropzoneProps) {
  const id = useId();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      await onFileSelect(file);
    },
    [onFileSelect],
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
      if (files.length > 0 && !isUploading) {
        handleFile(files[0]);
      }
    },
    [handleFile, isUploading],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && !isUploading) {
        handleFile(e.target.files[0]);
      }
      e.target.value = "";
    },
    [handleFile, isUploading],
  );

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center transition-colors",
        "focus-within:border-blue-500 hover:border-gray-400",
        isDragOver && "border-blue-500 bg-blue-50",
        isUploading && "pointer-events-none opacity-50",
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
        disabled={isUploading}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />

      <div className="flex flex-col items-center space-y-4">
        {isUploading ? (
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        ) : (
          <Upload className="h-12 w-12 text-gray-400" />
        )}

        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            {isUploading
              ? "Uploading..."
              : "Click to choose a file or drag here"}
          </p>

          <div className="space-y-1 text-sm text-gray-500">
            <p>Recommended dimensions: {recommendedDimensions}</p>
            <p>Size limit: {maxSize}</p>
          </div>
        </div>

        {!isUploading && (
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
