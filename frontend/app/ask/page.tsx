"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Library, SlidersHorizontal, ChevronDown, ChevronUp, X, User, MapPin } from "lucide-react";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import type { ChatMessage as ChatMessageType, Source, Book, CharacterSummary, Location } from "@/lib/types";
import { fetchLibraryStats, fetchLibrary, fetchCharacters, fetchLocations, queryStream } from "@/lib/api";
import ChatMessageComponent from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [booksReady, setBooksReady] = useState<number | null>(null);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [characterSearch, setCharacterSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [characterSuggestions, setCharacterSuggestions] = useState<CharacterSummary[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<Location[]>([]);
  const [showCharSuggestions, setShowCharSuggestions] = useState(false);
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const charInputRef = useRef<HTMLInputElement>(null);
  const locInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLibraryStats()
      .then((stats) => setBooksReady(stats.books_ready))
      .catch(() => setBooksReady(0));

    fetchLibrary()
      .then((data) => {
        const ready = data.books.filter((b) => b.status === "ready");
        setAvailableBooks(ready);
      })
      .catch(() => {});
  }, []);

  // Character autocomplete
  useEffect(() => {
    if (!characterSearch.trim()) {
      setCharacterSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchCharacters({ search: characterSearch, per_page: 8 })
        .then((data) => {
          setCharacterSuggestions(
            data.characters.filter((c) => !selectedCharacters.includes(c.canonical_name))
          );
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [characterSearch, selectedCharacters]);

  // Location autocomplete
  useEffect(() => {
    if (!locationSearch.trim()) {
      setLocationSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchLocations()
        .then((data) => {
          const q = locationSearch.toLowerCase();
          setLocationSuggestions(
            data.locations
              .filter(
                (loc) =>
                  loc.name.toLowerCase().includes(q) &&
                  !selectedLocations.includes(loc.name)
              )
              .slice(0, 8)
          );
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [locationSearch, selectedLocations]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(
    (question: string) => {
      if (streaming) return;

      const userMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: new Date(),
      };

      const assistantMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        sources: [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      const hasFilters = selectedBooks.length > 0 || selectedCharacters.length > 0 || selectedLocations.length > 0;
      const filters = hasFilters
        ? {
            books: selectedBooks.length > 0 ? selectedBooks : undefined,
            characters: selectedCharacters.length > 0 ? selectedCharacters : undefined,
            locations: selectedLocations.length > 0 ? selectedLocations : undefined,
          }
        : undefined;
      const es = queryStream(question, filters);
      esRef.current = es;

      es.addEventListener("token", (e: MessageEvent) => {
        // data is a plain string token, not JSON
        const token = e.data;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + token,
            };
          }
          return updated;
        });
      });

      es.addEventListener("sources", (e: MessageEvent) => {
        const sources: Source[] = JSON.parse(e.data) || [];
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = { ...last, sources };
          }
          return updated;
        });
      });

      es.addEventListener("done", () => {
        es.close();
        esRef.current = null;
        setStreaming(false);
      });

      es.addEventListener("error", (e: MessageEvent) => {
        let errorMsg = "An error occurred.";
        try {
          const data = JSON.parse(e.data);
          errorMsg = data.error || errorMsg;
        } catch {
          // parse failed, use default
        }
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: errorMsg,
            };
          }
          return updated;
        });
        es.close();
        esRef.current = null;
        setStreaming(false);
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setStreaming(false);
      };
    },
    [streaming, selectedBooks, selectedCharacters, selectedLocations]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  if (booksReady === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner label="Loading..." />
      </div>
    );
  }

  if (booksReady === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <Library className="w-12 h-12 text-text-secondary" />
        <h2 className="font-heading text-lg text-accent">No books yet</h2>
        <p className="text-sm text-text-secondary font-body text-center max-w-sm">
          Upload and ingest at least one book in your Library before asking
          questions.
        </p>
        <Link
          href="/library"
          className="px-4 py-2 bg-accent text-background font-ui text-sm rounded-lg hover:bg-accent-hover transition-colors"
        >
          Go to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl text-accent tracking-wide">
              Ask
            </h1>
            <p className="text-sm text-text-secondary font-ui mt-0.5">
              Ask questions about your Tolkien collection
            </p>
          </div>
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-ui transition-colors ${
              filtersOpen || selectedBooks.length > 0 || selectedCharacters.length > 0 || selectedLocations.length > 0
                ? "bg-accent text-background"
                : "bg-surface border border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {(selectedBooks.length + selectedCharacters.length + selectedLocations.length) > 0 && (
              <span className="bg-background text-accent text-xs px-1.5 py-0.5 rounded-full">
                {selectedBooks.length + selectedCharacters.length + selectedLocations.length}
              </span>
            )}
            {filtersOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mt-4 bg-surface border border-border rounded-lg p-4 space-y-5">
            {/* Clear all */}
            {(selectedBooks.length + selectedCharacters.length + selectedLocations.length) > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedBooks([]);
                    setSelectedCharacters([]);
                    setSelectedLocations([]);
                  }}
                  className="text-sm font-ui text-text-secondary hover:text-accent transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Books filter */}
            <div>
              <h3 className="text-sm font-ui text-text-primary mb-2">Books</h3>
              <div className="flex flex-wrap gap-2">
                {availableBooks.map((book) => {
                  const isSelected = selectedBooks.includes(book.title);
                  return (
                    <button
                      key={book.catalogue_id}
                      onClick={() => {
                        setSelectedBooks((prev) =>
                          isSelected
                            ? prev.filter((t) => t !== book.title)
                            : [...prev, book.title]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-ui transition-colors ${
                        isSelected
                          ? "bg-accent text-background"
                          : "bg-card border border-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {book.short_title || book.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Characters filter */}
            <div>
              <h3 className="text-sm font-ui text-text-primary mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Characters
              </h3>
              {selectedCharacters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedCharacters.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 bg-accent/20 border border-accent/30 rounded-lg px-2 py-1 text-sm font-ui text-accent"
                    >
                      {name}
                      <button
                        onClick={() =>
                          setSelectedCharacters((prev) => prev.filter((n) => n !== name))
                        }
                        className="hover:text-text-primary transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  ref={charInputRef}
                  type="text"
                  value={characterSearch}
                  onChange={(e) => {
                    setCharacterSearch(e.target.value);
                    setShowCharSuggestions(true);
                  }}
                  onFocus={() => setShowCharSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCharSuggestions(false), 200)}
                  placeholder="Type to search characters..."
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-ui placeholder:text-text-secondary outline-none"
                />
                {showCharSuggestions && characterSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {characterSuggestions.map((char) => (
                      <button
                        key={char.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedCharacters((prev) => [...prev, char.canonical_name]);
                          setCharacterSearch("");
                          setShowCharSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm font-ui text-text-primary hover:bg-surface transition-colors flex items-center justify-between"
                      >
                        <span>{char.canonical_name}</span>
                        {char.race && (
                          <span className="text-xs text-text-secondary">{char.race}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Locations filter */}
            <div>
              <h3 className="text-sm font-ui text-text-primary mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Locations
              </h3>
              {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedLocations.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 bg-accent/20 border border-accent/30 rounded-lg px-2 py-1 text-sm font-ui text-accent"
                    >
                      {name}
                      <button
                        onClick={() =>
                          setSelectedLocations((prev) => prev.filter((n) => n !== name))
                        }
                        className="hover:text-text-primary transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  ref={locInputRef}
                  type="text"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setShowLocSuggestions(true);
                  }}
                  onFocus={() => setShowLocSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocSuggestions(false), 200)}
                  placeholder="Type to search locations..."
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-ui placeholder:text-text-secondary outline-none"
                />
                {showLocSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {locationSuggestions.map((loc) => (
                      <button
                        key={loc.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedLocations((prev) => [...prev, loc.name]);
                          setLocationSearch("");
                          setShowLocSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm font-ui text-text-primary hover:bg-surface transition-colors flex items-center justify-between"
                      >
                        <span>{loc.name}</span>
                        {loc.region && (
                          <span className="text-xs text-text-secondary">{loc.region}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active filter tags (shown when panel is closed) */}
      {!filtersOpen && (selectedBooks.length > 0 || selectedCharacters.length > 0 || selectedLocations.length > 0) && (
        <div className="px-6 py-2 border-b border-border flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-secondary font-ui">Filtering:</span>
          {selectedBooks.map((title) => {
            const book = availableBooks.find((b) => b.title === title);
            return (
              <span
                key={`book-${title}`}
                className="inline-flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1 text-sm font-ui text-text-primary"
              >
                {book?.short_title || title}
                <button
                  onClick={() =>
                    setSelectedBooks((prev) => prev.filter((t) => t !== title))
                  }
                  className="text-text-secondary hover:text-accent transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {selectedCharacters.map((name) => (
            <span
              key={`char-${name}`}
              className="inline-flex items-center gap-1 bg-accent/20 border border-accent/30 rounded-lg px-2 py-1 text-sm font-ui text-accent"
            >
              <User className="w-3 h-3" />
              {name}
              <button
                onClick={() =>
                  setSelectedCharacters((prev) => prev.filter((n) => n !== name))
                }
                className="hover:text-text-primary transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedLocations.map((name) => (
            <span
              key={`loc-${name}`}
              className="inline-flex items-center gap-1 bg-accent/20 border border-accent/30 rounded-lg px-2 py-1 text-sm font-ui text-accent"
            >
              <MapPin className="w-3 h-3" />
              {name}
              <button
                onClick={() =>
                  setSelectedLocations((prev) => prev.filter((n) => n !== name))
                }
                className="hover:text-text-primary transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="font-heading text-base text-accent uppercase tracking-wider">
              What would you like to know?
            </p>
            <p className="text-sm text-text-secondary font-ui max-w-sm">
              Ask anything about the books in your library. Answers will include
              citations to the source text.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatMessageComponent key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4 max-w-3xl mx-auto w-full">
        <ChatInput onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  );
}
