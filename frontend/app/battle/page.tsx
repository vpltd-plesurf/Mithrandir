"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Swords, User, X, RotateCcw } from "lucide-react";
import type { CharacterSummary, Source } from "@/lib/types";
import { fetchCharacters, battleStream } from "@/lib/api";
import Spinner from "@/components/Spinner";
import SourceCitation from "@/components/SourceCitation";

interface BattleCharacter {
  name: string;
  race: string | null;
}

export default function BattlePage() {
  const [characterA, setCharacterA] = useState<BattleCharacter | null>(null);
  const [characterB, setCharacterB] = useState<BattleCharacter | null>(null);

  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [suggestionsA, setSuggestionsA] = useState<CharacterSummary[]>([]);
  const [suggestionsB, setSuggestionsB] = useState<CharacterSummary[]>([]);
  const [showSugA, setShowSugA] = useState(false);
  const [showSugB, setShowSugB] = useState(false);

  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [battleDone, setBattleDone] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Autocomplete for A
  useEffect(() => {
    if (!searchA.trim()) { setSuggestionsA([]); return; }
    const timer = setTimeout(() => {
      fetchCharacters({ search: searchA, per_page: 8 })
        .then((data) => setSuggestionsA(data.characters))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [searchA]);

  // Autocomplete for B
  useEffect(() => {
    if (!searchB.trim()) { setSuggestionsB([]); return; }
    const timer = setTimeout(() => {
      fetchCharacters({ search: searchB, per_page: 8 })
        .then((data) => setSuggestionsB(data.characters))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [searchB]);

  // Auto-scroll result
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  const selectA = (char: CharacterSummary) => {
    setCharacterA({ name: char.canonical_name, race: char.race });
    setSearchA("");
    setShowSugA(false);
    setSuggestionsA([]);
  };

  const selectB = (char: CharacterSummary) => {
    setCharacterB({ name: char.canonical_name, race: char.race });
    setSearchB("");
    setShowSugB(false);
    setSuggestionsB([]);
  };

  const startBattle = useCallback(() => {
    if (!characterA || !characterB || streaming) return;

    setResult("");
    setSources([]);
    setBattleDone(false);
    setStreaming(true);

    const es = battleStream(characterA.name, characterB.name);
    esRef.current = es;

    es.addEventListener("token", (e: MessageEvent) => {
      setResult((prev) => prev + e.data);
    });

    es.addEventListener("sources", (e: MessageEvent) => {
      try {
        const parsed: Source[] = JSON.parse(e.data) || [];
        setSources(parsed);
      } catch {
        // ignore
      }
    });

    es.addEventListener("done", () => {
      es.close();
      esRef.current = null;
      setStreaming(false);
      setBattleDone(true);
    });

    es.addEventListener("error", (e: MessageEvent) => {
      let errorMsg = "Battle analysis failed.";
      try {
        const data = JSON.parse(e.data);
        errorMsg = data.error || errorMsg;
      } catch {
        // use default
      }
      setResult((prev) => prev + "\n\n" + errorMsg);
      es.close();
      esRef.current = null;
      setStreaming(false);
      setBattleDone(true);
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setStreaming(false);
      setBattleDone(true);
    };
  }, [characterA, characterB, streaming]);

  const resetBattle = () => {
    esRef.current?.close();
    esRef.current = null;
    setCharacterA(null);
    setCharacterB(null);
    setResult("");
    setSources([]);
    setStreaming(false);
    setBattleDone(false);
    setSearchA("");
    setSearchB("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { esRef.current?.close(); };
  }, []);

  const canBattle = characterA && characterB && !streaming;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-accent tracking-wide flex items-center gap-3">
              <Swords className="w-6 h-6" />
              Power Battle
            </h1>
            <p className="text-sm text-text-secondary font-ui mt-0.5">
              Pick two characters and see who would win based on the texts
            </p>
          </div>
          {(result || characterA || characterB) && (
            <button
              onClick={resetBattle}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-ui bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Battle
            </button>
          )}
        </div>
      </div>

      {/* Character selectors */}
      <div className="px-6 py-6 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {/* Character A */}
          <div className="flex-1">
            {characterA ? (
              <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 animate-fadeIn">
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-base text-accent truncate">{characterA.name}</p>
                  <p className="text-sm font-ui text-text-secondary">{characterA.race || "Unknown"}</p>
                </div>
                {!streaming && !result && (
                  <button onClick={() => setCharacterA(null)} className="text-text-secondary hover:text-accent transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchA}
                  onChange={(e) => { setSearchA(e.target.value); setShowSugA(true); }}
                  onFocus={() => setShowSugA(true)}
                  onBlur={() => setTimeout(() => setShowSugA(false), 200)}
                  placeholder="Choose first character..."
                  className="w-full bg-card border border-border rounded-lg px-4 py-3 text-base text-text-primary font-ui placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                />
                {showSugA && suggestionsA.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {suggestionsA.map((char) => (
                      <button
                        key={char.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectA(char)}
                        className="w-full text-left px-4 py-2.5 text-sm font-ui text-text-primary hover:bg-surface transition-colors flex items-center justify-between"
                      >
                        <span>{char.canonical_name}</span>
                        {char.race && <span className="text-xs text-text-secondary">{char.race}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VS / Battle button */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            {canBattle && !result ? (
              <button
                onClick={startBattle}
                className="px-5 py-2.5 bg-accent text-background font-heading text-sm rounded-lg hover:bg-accent-hover transition-colors uppercase tracking-wider"
              >
                Battle!
              </button>
            ) : (
              <span className="font-heading text-lg text-text-secondary uppercase tracking-wider">vs</span>
            )}
          </div>

          {/* Character B */}
          <div className="flex-1">
            {characterB ? (
              <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 animate-fadeIn">
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-base text-accent truncate">{characterB.name}</p>
                  <p className="text-sm font-ui text-text-secondary">{characterB.race || "Unknown"}</p>
                </div>
                {!streaming && !result && (
                  <button onClick={() => setCharacterB(null)} className="text-text-secondary hover:text-accent transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchB}
                  onChange={(e) => { setSearchB(e.target.value); setShowSugB(true); }}
                  onFocus={() => setShowSugB(true)}
                  onBlur={() => setTimeout(() => setShowSugB(false), 200)}
                  placeholder="Choose second character..."
                  className="w-full bg-card border border-border rounded-lg px-4 py-3 text-base text-text-primary font-ui placeholder:text-text-secondary outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                />
                {showSugB && suggestionsB.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {suggestionsB.map((char) => (
                      <button
                        key={char.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectB(char)}
                        className="w-full text-left px-4 py-2.5 text-sm font-ui text-text-primary hover:bg-surface transition-colors flex items-center justify-between"
                      >
                        <span>{char.canonical_name}</span>
                        {char.race && <span className="text-xs text-text-secondary">{char.race}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result area */}
      <div ref={resultRef} className="flex-1 overflow-y-auto px-6 py-6">
        {streaming && !result && (
          <div className="flex justify-center py-12">
            <Spinner label="Gathering evidence and analyzing powers..." />
          </div>
        )}

        {result && (
          <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="bg-card border border-border rounded-xl px-6 py-5">
              <div className="font-body text-base text-text-primary leading-relaxed whitespace-pre-wrap">
                {result}
                {streaming && (
                  <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse ml-1" />
                )}
              </div>
              {battleDone && sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <SourceCitation sources={sources} />
                </div>
              )}
            </div>
          </div>
        )}

        {!result && !streaming && characterA && characterB && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Swords className="w-10 h-10 text-text-secondary opacity-30" />
            <p className="font-heading text-base text-accent uppercase tracking-wider">
              Ready to battle
            </p>
            <p className="text-sm text-text-secondary font-ui max-w-sm">
              Click the Battle button above to see who would win based on Tolkien&apos;s texts.
            </p>
          </div>
        )}

        {!result && !streaming && (!characterA || !characterB) && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Swords className="w-10 h-10 text-text-secondary opacity-20" />
            <p className="text-sm text-text-secondary font-ui max-w-sm">
              Select two characters above to begin a power comparison.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
