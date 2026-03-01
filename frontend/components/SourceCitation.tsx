"use client";

import { useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import type { Source } from "@/lib/types";

interface Props {
  sources: Source[];
}

export default function SourceCitation({ sources }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm text-text-secondary font-ui hover:text-accent transition-colors"
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        <BookOpen className="w-4 h-4" />
        <span>
          {sources.length} source{sources.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 ml-5 expand-enter">
          {sources.map((source) => (
            <div
              key={source.index}
              className="px-3 py-2 bg-card rounded-lg border border-border text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-ui text-accent">
                  [{source.index}] {source.book}
                </span>
                <span className="font-ui text-text-secondary">
                  {Math.round(source.relevance_score * 100)}%
                </span>
              </div>
              {source.chapter && (
                <p className="text-text-secondary font-ui mb-1">
                  {source.chapter}
                </p>
              )}
              <p className="text-text-primary font-body leading-relaxed">
                {source.excerpt}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
