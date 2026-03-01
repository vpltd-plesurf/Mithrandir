"use client";

import { X } from "lucide-react";
import type { MatchCandidate } from "@/lib/types";

interface Props {
  filename: string;
  candidates: MatchCandidate[];
  onSelect: (catalogueId: number) => void;
  onDismiss: () => void;
}

export default function BookMatchModal({
  filename,
  candidates,
  onSelect,
  onDismiss,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm text-accent uppercase tracking-wider">
            Match Book
          </h2>
          <button
            onClick={onDismiss}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-text-primary font-body mb-1">
          Which book is this file?
        </p>
        <p className="text-xs text-text-secondary font-ui mb-4 truncate">
          {filename}
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {candidates.map((c) => (
            <button
              key={c.catalogue_id}
              onClick={() => onSelect(c.catalogue_id)}
              className="w-full text-left px-4 py-3 bg-card rounded-lg border border-border hover:border-accent/50 transition-colors"
            >
              <p className="text-sm text-text-primary font-body">
                {c.title}
              </p>
              <p className="text-xs text-text-secondary font-ui mt-0.5">
                {Math.round(c.confidence * 100)}% match
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="mt-4 w-full text-xs text-text-secondary font-ui hover:text-text-primary transition-colors py-2"
        >
          Skip this file
        </button>
      </div>
    </div>
  );
}
