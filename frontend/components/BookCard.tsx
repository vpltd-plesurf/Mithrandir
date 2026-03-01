"use client";

import { CheckCircle, Circle, Loader2, AlertCircle, Upload, Eye } from "lucide-react";
import type { Book } from "@/lib/types";

const statusConfig = {
  missing: { icon: Circle, color: "text-text-secondary", label: "Missing" },
  uploaded: { icon: Upload, color: "text-mithril", label: "Uploaded" },
  ingesting: { icon: Loader2, color: "text-accent", label: "Ingesting" },
  ready: { icon: CheckCircle, color: "text-success", label: "Ready" },
  error: { icon: AlertCircle, color: "text-error", label: "Error" },
};

interface Props {
  book: Book;
  progress?: { stage: string; progress: number; detail: string };
  onPreview?: (catalogueId: number) => void;
}

export default function BookCard({ book, progress, onPreview }: Props) {
  const config = statusConfig[book.status] || statusConfig.missing;
  const Icon = config.icon;
  const isIngesting = book.status === "ingesting" || progress?.stage === "embedding";
  const hasFile = book.status !== "missing";

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-card rounded-lg border border-border hover:border-accent/30 transition-colors">
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${config.color} ${
          isIngesting ? "animate-spin" : ""
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-body text-base text-text-primary truncate">
          {book.title}
        </p>
        {progress && book.status === "ingesting" ? (
          <div className="mt-1">
            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
            <p className="text-sm text-text-secondary mt-0.5 font-ui">
              {progress.detail || progress.stage}
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary font-ui">
            {book.status === "ready" && book.actual_words
              ? `${book.actual_words.toLocaleString()} words`
              : book.estimated_words
                ? `~${book.estimated_words.toLocaleString()} words`
                : ""}
          </p>
        )}
        {book.status === "error" && book.error_message && (
          <p className="text-sm text-error mt-0.5 font-ui truncate">
            {book.error_message}
          </p>
        )}
      </div>
      {hasFile && onPreview && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview(book.catalogue_id);
          }}
          className="flex-shrink-0 p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
          title="Preview book content"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      <span className={`text-sm font-ui ${config.color} flex-shrink-0`}>
        {config.label}
      </span>
    </div>
  );
}
