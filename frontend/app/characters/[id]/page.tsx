"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, BookOpen, Users } from "lucide-react";
import type { CharacterDetail, CharacterMention } from "@/lib/types";
import { fetchCharacter, fetchCharacterMentions } from "@/lib/api";
import Spinner from "@/components/Spinner";

export default function CharacterDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [mentions, setMentions] = useState<CharacterMention[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCharacter(id)
      .then(setCharacter)
      .catch(() => {});
  }, [id]);

  const loadMentions = () => {
    if (mentions.length > 0) {
      setShowMentions(!showMentions);
      return;
    }
    setLoadingMentions(true);
    setShowMentions(true);
    fetchCharacterMentions(id, 10)
      .then((data) => setMentions(data.mentions))
      .catch(() => {})
      .finally(() => setLoadingMentions(false));
  };

  if (!character) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 flex justify-center pt-24">
        <Spinner label="Loading character..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Back link */}
      <Link
        href="/characters"
        className="inline-flex items-center gap-2 text-sm text-text-secondary font-ui hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All Characters
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center">
          <User className="w-7 h-7 text-accent" />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-accent tracking-wide">
            {character.canonical_name}
          </h1>
          <p className="text-base text-text-secondary font-ui">
            {character.race || "Unknown race"}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-6 animate-fadeIn">
        {/* Aliases */}
        {character.aliases.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-heading text-base text-accent mb-3">
              Also known as
            </h2>
            <div className="flex flex-wrap gap-2">
              {character.aliases.map((a, i) => (
                <span
                  key={i}
                  className="bg-surface border border-border rounded-full px-3 py-1 text-sm text-text-primary font-ui"
                >
                  {a.alias}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Family */}
        {(character.father || character.mother || character.children.length > 0 || (character.spouse && character.spouse.length > 0)) && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-heading text-base text-accent mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Family
            </h2>
            <div className="space-y-2 text-base font-ui">
              {character.father && (
                <p className="text-text-primary">
                  <span className="text-text-secondary">Father:</span>{" "}
                  <Link
                    href={`/characters/${character.father.id}`}
                    className="text-mithril hover:text-accent transition-colors"
                  >
                    {character.father.canonical_name}
                  </Link>
                </p>
              )}
              {character.mother && (
                <p className="text-text-primary">
                  <span className="text-text-secondary">Mother:</span>{" "}
                  <Link
                    href={`/characters/${character.mother.id}`}
                    className="text-mithril hover:text-accent transition-colors"
                  >
                    {character.mother.canonical_name}
                  </Link>
                </p>
              )}
              {character.spouse && character.spouse.length > 0 && (
                <p className="text-text-primary">
                  <span className="text-text-secondary">Spouse:</span>{" "}
                  {character.spouse.map((s, i) => (
                    <span key={s.id}>
                      <Link
                        href={`/characters/${s.id}`}
                        className="text-mithril hover:text-accent transition-colors"
                      >
                        {s.canonical_name}
                      </Link>
                      {i < character.spouse.length - 1 && ", "}
                    </span>
                  ))}
                </p>
              )}
              {character.children.length > 0 && (
                <p className="text-text-primary">
                  <span className="text-text-secondary">Children:</span>{" "}
                  {character.children.map((child, i) => (
                    <span key={child.id}>
                      <Link
                        href={`/characters/${child.id}`}
                        className="text-mithril hover:text-accent transition-colors"
                      >
                        {child.canonical_name}
                      </Link>
                      {i < character.children.length - 1 && ", "}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {character.description && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-heading text-base text-accent mb-3">
              Description
            </h2>
            <p className="text-base text-text-primary font-body leading-relaxed">
              {character.description}
            </p>
          </div>
        )}

        {/* Mentions */}
        <div>
          <button
            onClick={loadMentions}
            className="flex items-center gap-2 text-base font-ui text-accent hover:text-accent-hover transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {showMentions ? "Hide" : "Show"} text mentions
          </button>

          {showMentions && (
            <div className="mt-3 space-y-3">
              {loadingMentions ? (
                <p className="text-text-secondary font-ui text-sm">
                  Searching corpus...
                </p>
              ) : mentions.length === 0 ? (
                <p className="text-text-secondary font-ui text-sm">
                  No mentions found.
                </p>
              ) : (
                mentions.map((mention, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-ui text-accent">
                        {mention.book}
                      </span>
                      <span className="text-sm font-ui text-text-secondary">
                        {Math.round(mention.relevance_score * 100)}%
                      </span>
                    </div>
                    {mention.chapter && (
                      <p className="text-sm text-text-secondary font-ui mb-1">
                        {mention.chapter}
                      </p>
                    )}
                    <p className="text-sm text-text-primary font-body leading-relaxed">
                      {mention.excerpt}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
