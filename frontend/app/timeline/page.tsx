"use client";

import { useState, useEffect } from "react";
import { Clock, BookOpen } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { fetchTimeline, fetchTimelineAges } from "@/lib/api";
import Spinner from "@/components/Spinner";

const ageColors: Record<string, string> = {
  "Years of the Trees": "border-amber-500",
  "First Age": "border-emerald-500",
  "Second Age": "border-blue-500",
  "Third Age": "border-purple-500",
  "Fourth Age": "border-rose-500",
};

const ageDotColors: Record<string, string> = {
  "Years of the Trees": "bg-amber-500",
  "First Age": "bg-emerald-500",
  "Second Age": "bg-blue-500",
  "Third Age": "bg-purple-500",
  "Fourth Age": "bg-rose-500",
};

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [selectedAge, setSelectedAge] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineAges()
      .then((data) => setAges(data.ages))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTimeline(selectedAge || undefined)
      .then((data) => setEvents(data.events))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedAge]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-heading text-2xl text-accent tracking-wide mb-6">
        Timeline
      </h1>

      {/* Age filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedAge("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-ui transition-colors ${
            selectedAge === ""
              ? "bg-accent text-background"
              : "bg-surface border border-border text-text-secondary hover:text-text-primary"
          }`}
        >
          All Ages
        </button>
        {ages.map((age) => (
          <button
            key={age}
            onClick={() => setSelectedAge(age)}
            className={`px-3 py-1.5 rounded-lg text-sm font-ui transition-colors ${
              selectedAge === age
                ? "bg-accent text-background"
                : "bg-surface border border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {age}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner label="Loading timeline..." /></div>
      ) : events.length === 0 ? (
        <div className="flex items-center gap-2 text-text-secondary font-ui py-8">
          <Clock className="w-5 h-5" />
          <span>No events found.</span>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-0">
            {events.map((event, i) => {
              const showAgeHeader =
                !selectedAge &&
                (i === 0 || events[i - 1].age !== event.age);
              const isExpanded = expandedId === event.id;
              const dotColor = ageDotColors[event.age] || "bg-accent";
              const borderColor = ageColors[event.age] || "border-accent";

              return (
                <div key={event.id}>
                  {showAgeHeader && (
                    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
                      <div className={`w-6 h-6 rounded-full ${dotColor} flex items-center justify-center z-10`}>
                        <Clock className="w-3 h-3 text-background" />
                      </div>
                      <h2 className="font-heading text-lg text-accent uppercase tracking-wider">
                        {event.age}
                      </h2>
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    className="flex items-start gap-4 w-full text-left pl-0 py-2 group"
                  >
                    {/* Dot */}
                    <div className={`w-[23px] flex-shrink-0 flex justify-center pt-1.5 z-10`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} opacity-60 group-hover:opacity-100 transition-opacity`} />
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-4 border-l-2 ${borderColor} border-opacity-20 pl-4 -ml-[1px]`}>
                      <div className="flex items-baseline gap-3">
                        <span className="text-sm font-ui text-text-secondary flex-shrink-0">
                          {event.year}
                        </span>
                        <span className="text-base font-body text-text-primary group-hover:text-accent transition-colors">
                          {event.name}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 bg-card border border-border rounded-lg p-3 expand-enter">
                          {event.description && (
                            <p className="text-sm text-text-primary font-body leading-relaxed mb-2">
                              {event.description}
                            </p>
                          )}
                          {event.source_book && (
                            <p className="text-sm text-text-secondary font-ui flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              {event.source_book}
                              {event.source_chapter && ` — ${event.source_chapter}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
