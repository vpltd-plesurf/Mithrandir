"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { BookPreview } from "@/lib/types";
import { fetchBookPreview } from "@/lib/api";

interface Props {
  catalogueId: number;
  onClose: () => void;
}

export default function BookPreviewModal({ catalogueId, onClose }: Props) {
  const [preview, setPreview] = useState<BookPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookPreview(catalogueId)
      .then(setPreview)
      .catch((e) => setError(e.message));
  }, [catalogueId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="font-heading text-sm text-accent uppercase tracking-wider truncate">
              {preview?.title || "Loading..."}
            </h2>
            {preview && (
              <p className="text-xs text-text-secondary font-ui mt-0.5 truncate">
                {preview.filename} ({preview.format.toUpperCase()})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <p className="text-sm text-error font-ui">{error}</p>
          )}

          {!preview && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Chapter list */}
              {preview.chapters.length > 0 && (
                <div>
                  <h3 className="text-xs font-ui text-text-secondary uppercase tracking-wider mb-2">
                    Chapters found
                  </h3>
                  <div className="space-y-1">
                    {preview.chapters.map((ch, i) => (
                      <p key={i} className="text-sm text-text-primary font-body">
                        {ch.title}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Text preview */}
              <div>
                <h3 className="text-xs font-ui text-text-secondary uppercase tracking-wider mb-2">
                  Text preview
                </h3>
                <div className="bg-card rounded-lg border border-border p-4 max-h-96 overflow-y-auto">
                  <p className="text-sm text-text-primary font-body leading-relaxed whitespace-pre-wrap">
                    {preview.preview}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-ui text-text-secondary hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
