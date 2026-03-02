"use client";

import { useEffect, useState } from "react";
import { fetchCharacters } from "@/lib/api";
import type { CharacterSummary } from "@/lib/types";

const QUESTION_TEMPLATES = [
  (name: string) => `Who is ${name}?`,
  (name: string) => `What is ${name}'s role in the story?`,
  (name: string) => `Tell me about ${name}'s most important deeds`,
];

interface Props {
  onSend: (question: string) => void;
}

export default function CharacterPromptCards({ onSend }: Props) {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);

  useEffect(() => {
    fetchCharacters({ per_page: 9 })
      .then((data) => setCharacters(data.characters))
      .catch(() => {});
  }, []);

  if (characters.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <p className="font-heading text-base text-accent uppercase tracking-wider text-center mb-1">
        What would you like to know?
      </p>
      <p className="text-sm text-text-secondary font-ui text-center mb-6">
        Ask anything about your Tolkien collection, or start with a character below.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {characters.map((char) => (
          <div
            key={char.id}
            className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-sm text-accent leading-snug">
                {char.canonical_name}
              </h3>
              {char.race && (
                <span className="shrink-0 text-xs font-ui text-text-secondary bg-surface border border-border rounded-full px-2 py-0.5">
                  {char.race}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {QUESTION_TEMPLATES.map((tpl, i) => {
                const q = tpl(char.canonical_name);
                return (
                  <button
                    key={i}
                    onClick={() => onSend(q)}
                    className="text-left text-xs font-ui text-text-secondary hover:text-text-primary bg-surface hover:bg-border rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
