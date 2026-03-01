"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Grid3X3, GitBranch, Users } from "lucide-react";
import dynamic from "next/dynamic";
import type { CharacterSummary } from "@/lib/types";
import { fetchCharacters, fetchCharacterRaces } from "@/lib/api";
import CharacterCard from "@/components/CharacterCard";
import Spinner from "@/components/Spinner";

const CharacterGraph = dynamic(() => import("@/components/CharacterGraph"), {
  ssr: false,
});

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [race, setRace] = useState("");
  const [races, setRaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "graph">("grid");

  const perPage = 30;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load races on mount
  useEffect(() => {
    fetchCharacterRaces()
      .then((data) => setRaces(data.races))
      .catch(() => {});
  }, []);

  // Load characters
  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCharacters({
        search: debouncedSearch || undefined,
        race: race || undefined,
        page,
        per_page: perPage,
      });
      setCharacters(data.characters);
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, race, page]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className={viewMode === "graph" ? "flex flex-col h-screen overflow-hidden" : ""}>
      {/* Header */}
      <div className={viewMode === "graph" ? "border-b border-border px-6 py-4" : "max-w-4xl mx-auto px-6 pt-8"}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-heading text-2xl text-accent tracking-wide">
            Characters
          </h1>
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-ui transition-colors ${
                viewMode === "grid"
                  ? "bg-accent text-background"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Grid
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-ui transition-colors ${
                viewMode === "graph"
                  ? "bg-accent text-background"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Graph
            </button>
          </div>
        </div>

        {viewMode === "grid" && (
          <>
            {/* Filters */}
            <div className="flex gap-3 mb-6">
              <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search characters..."
                  className="flex-1 bg-transparent text-base text-text-primary font-ui placeholder:text-text-secondary outline-none"
                />
              </div>
              <select
                value={race}
                onChange={(e) => {
                  setRace(e.target.value);
                  setPage(1);
                }}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-base text-text-primary font-ui outline-none"
              >
                <option value="">All races</option>
                {races.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <p className="text-sm text-text-secondary font-ui mb-4">
              {total} character{total !== 1 ? "s" : ""}
              {debouncedSearch && ` matching "${debouncedSearch}"`}
              {race && ` (${race})`}
            </p>
          </>
        )}
      </div>

      {viewMode === "graph" ? (
        <CharacterGraph />
      ) : (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-12"><Spinner label="Loading characters..." /></div>
          ) : characters.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-text-secondary">
              <Users className="w-8 h-8 opacity-40" />
              <p className="font-ui">No characters found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {characters.map((char) => (
                <CharacterCard key={char.id} character={char} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm font-ui text-text-primary hover:bg-card transition-colors disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary font-ui">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm font-ui text-text-primary hover:bg-card transition-colors disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
