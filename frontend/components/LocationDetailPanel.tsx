"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, MapPin } from "lucide-react";
import type { Location, LocationMention } from "@/lib/types";
import { fetchLocationMentions } from "@/lib/api";

interface LocationDetailPanelProps {
  location: Location;
  onClose: () => void;
}

export default function LocationDetailPanel({ location, onClose }: LocationDetailPanelProps) {
  const [mentions, setMentions] = useState<LocationMention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLocationMentions(location.id, 5)
      .then((data) => setMentions(data.mentions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location.id]);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-surface border-l border-border overflow-y-auto z-30 shadow-xl">
      <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-heading text-base text-accent">{location.name}</h3>
            <div className="flex gap-2 mt-1">
              {location.region && (
                <span className="text-sm text-text-secondary font-ui">{location.region}</span>
              )}
              {location.type && (
                <span className="text-sm text-text-secondary font-ui capitalize">
                  {location.type.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {location.description && (
          <p className="text-sm text-text-primary font-body leading-relaxed">
            {location.description}
          </p>
        )}

        <div>
          <h4 className="text-sm font-ui text-accent flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Text mentions
          </h4>

          {loading ? (
            <p className="text-sm text-text-secondary font-ui">Searching corpus...</p>
          ) : mentions.length === 0 ? (
            <p className="text-sm text-text-secondary font-ui">No mentions found.</p>
          ) : (
            <div className="space-y-2">
              {mentions.map((m, i) => (
                <div key={i} className="bg-card rounded-lg p-2 border border-border">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-ui text-accent">{m.book}</span>
                    <span className="text-sm font-ui text-text-secondary">
                      {Math.round(m.relevance_score * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-text-primary font-body leading-relaxed">
                    {m.excerpt}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
