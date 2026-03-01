"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Book } from "@/lib/types";
import BookCard from "./BookCard";

interface Props {
  tier: number;
  label: string;
  books: Book[];
  progressMap: Record<number, { stage: string; progress: number; detail: string }>;
  onPreview?: (catalogueId: number) => void;
}

export default function TierSection({ tier, label, books, progressMap, onPreview }: Props) {
  const [open, setOpen] = useState(true);
  const ready = books.filter((b) => b.status === "ready").length;

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-secondary" />
        )}
        <span className="font-heading text-base text-accent uppercase tracking-wider">
          Tier {tier}: {label}
        </span>
        <span className="text-sm text-text-secondary font-ui ml-2">
          ({ready}/{books.length})
        </span>
      </button>
      {open && (
        <div className="space-y-2 ml-6">
          {books.map((book) => (
            <BookCard
              key={book.catalogue_id}
              book={book}
              progress={progressMap[book.catalogue_id]}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}
