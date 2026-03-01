"use client";

import { useState, useCallback } from "react";
import { Upload, FileText } from "lucide-react";

interface Props {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function BookDropZone({ onFilesSelected, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter(
        (f) =>
          f.name.endsWith(".epub") ||
          f.name.endsWith(".pdf")
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
      e.target.value = "";
    },
    [onFilesSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragOver
          ? "border-accent bg-accent/10"
          : "border-border hover:border-accent/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      onClick={() => {
        if (!disabled) {
          document.getElementById("file-upload-input")?.click();
        }
      }}
    >
      <input
        id="file-upload-input"
        type="file"
        accept=".epub,.pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        {dragOver ? (
          <FileText className="w-10 h-10 text-accent" />
        ) : (
          <Upload className="w-10 h-10 text-text-secondary" />
        )}
        <div>
          <p className="font-body text-sm text-text-primary">
            {dragOver ? "Drop to upload" : "Drop EPUB or PDF files here"}
          </p>
          <p className="text-xs text-text-secondary font-ui mt-1">
            or click to browse
          </p>
        </div>
      </div>
    </div>
  );
}
