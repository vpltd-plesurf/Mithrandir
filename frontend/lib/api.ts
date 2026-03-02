import type {
  BookPreview,
  CharacterDetail,
  CharacterGraph,
  CharactersResponse,
  ConversationTurn,
  HealthStatus,
  LibraryResponse,
  LibraryStats,
  Source,
  UploadResponse,
} from "./types";

const API_BASE = "/api";
// Direct browser→backend for SSE streams and large uploads (bypasses Next.js proxy)
const BACKEND_DIRECT = process.env.NEXT_PUBLIC_BACKEND_URL
  ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
  : "http://localhost:8000/api";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthStatus> {
  return fetchJSON<HealthStatus>("/health");
}

export async function fetchLibrary(): Promise<LibraryResponse> {
  return fetchJSON<LibraryResponse>("/library");
}

export async function fetchLibraryStats(): Promise<LibraryStats> {
  return fetchJSON<LibraryStats>("/library/stats");
}

export async function uploadBook(
  file: File,
  catalogueId?: number
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (catalogueId !== undefined) {
    formData.append("catalogue_id", String(catalogueId));
  }
  // Upload directly to backend to bypass Next.js proxy body size limit
  const res = await fetch(`${BACKEND_DIRECT}/library/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Upload failed: ${detail}`);
  }
  return res.json();
}

export async function confirmMatch(
  filename: string,
  catalogueId: number
): Promise<void> {
  await fetchJSON("/library/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, catalogue_id: catalogueId }),
  });
}

export async function triggerIngest(catalogueId: number): Promise<void> {
  await fetchJSON(`/library/ingest/${catalogueId}`, { method: "POST" });
}

export async function removeBook(catalogueId: number): Promise<void> {
  await fetchJSON(`/library/${catalogueId}`, { method: "DELETE" });
}

export async function fetchBookPreview(catalogueId: number): Promise<BookPreview> {
  return fetchJSON<BookPreview>(`/library/${catalogueId}/preview`);
}

export function subscribeToProgress(
  onEvent: (data: unknown) => void,
  onError?: (error: Event) => void
): EventSource {
  const es = new EventSource(`${API_BASE}/library/progress`);
  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch {
      // ignore parse errors
    }
  };
  if (onError) {
    es.onerror = onError;
  }
  return es;
}

// --- Characters ---

export async function fetchCharacters(params?: {
  search?: string;
  race?: string;
  page?: number;
  per_page?: number;
}): Promise<CharactersResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.race) qs.set("race", params.race);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString();
  return fetchJSON<CharactersResponse>(`/characters${query ? `?${query}` : ""}`);
}

export async function fetchCharacter(id: number): Promise<CharacterDetail> {
  return fetchJSON<CharacterDetail>(`/characters/${id}`);
}

export async function fetchCharacterMentions(
  id: number,
  limit = 20,
): Promise<{ character: string; mentions: { book: string; chapter: string | null; excerpt: string; relevance_score: number }[] }> {
  return fetchJSON(`/characters/${id}/mentions?limit=${limit}`);
}

export async function fetchCharacterRaces(): Promise<{ races: string[] }> {
  return fetchJSON("/characters/races");
}

export async function fetchCharacterGraph(): Promise<CharacterGraph> {
  return fetchJSON<CharacterGraph>("/characters/graph");
}

// --- Locations ---

export async function fetchLocations(params?: {
  region?: string;
  type?: string;
}): Promise<{ locations: import("./types").Location[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.region) qs.set("region", params.region);
  if (params?.type) qs.set("type", params.type);
  const query = qs.toString();
  return fetchJSON(`/locations${query ? `?${query}` : ""}`);
}

export async function fetchLocation(id: number): Promise<import("./types").Location> {
  return fetchJSON(`/locations/${id}`);
}

export async function fetchLocationMentions(
  id: number,
  limit = 10,
): Promise<{ location: string; mentions: import("./types").LocationMention[] }> {
  return fetchJSON(`/locations/${id}/mentions?limit=${limit}`);
}

export async function fetchLocationRegions(): Promise<{ regions: string[] }> {
  return fetchJSON("/locations/regions");
}

// --- Timeline ---

export async function fetchTimeline(age?: string): Promise<{ events: import("./types").TimelineEvent[]; total: number }> {
  const qs = age ? `?age=${encodeURIComponent(age)}` : "";
  return fetchJSON(`/timeline${qs}`);
}

export async function fetchTimelineAges(): Promise<{ ages: string[] }> {
  return fetchJSON("/timeline/ages");
}

export function queryStream(
  question: string,
  history: ConversationTurn[],
  filters: { books?: string[]; characters?: string[]; locations?: string[]; top_k?: number } | undefined,
  callbacks: {
    onStatus: (status: string) => void;
    onToken: (token: string) => void;
    onSources: (sources: Source[]) => void;
    onDone: () => void;
    onError: (message: string) => void;
  }
): { abort: () => void } {
  const controller = new AbortController();

  const body: Record<string, unknown> = { question, history };
  if (filters) {
    const f: Record<string, unknown> = {};
    if (filters.books?.length) f.books = filters.books;
    if (filters.characters?.length) f.characters = filters.characters;
    if (filters.locations?.length) f.locations = filters.locations;
    if (Object.keys(f).length) body.filters = f;
  }
  if (filters?.top_k) body.top_k = filters.top_k;

  (async () => {
    try {
      const res = await fetch(`/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        callbacks.onError(`Request failed: ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newline
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const block of parts) {
          let eventType = "message";
          let data = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) data = line.slice(6);
          }
          if (eventType === "status") {
            callbacks.onStatus(data);
          } else if (eventType === "token") {
            callbacks.onToken(data);
          } else if (eventType === "sources") {
            try { callbacks.onSources(JSON.parse(data)); } catch { /* ignore */ }
          } else if (eventType === "done") {
            callbacks.onDone();
          } else if (eventType === "error") {
            try {
              callbacks.onError(JSON.parse(data)?.error ?? "An error occurred.");
            } catch {
              callbacks.onError("An error occurred.");
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError("Stream connection failed.");
      }
    }
  })();

  return { abort: () => controller.abort() };
}

// --- Battle ---

export function battleStream(characterA: string, characterB: string): EventSource {
  const params = new URLSearchParams({
    character_a: characterA,
    character_b: characterB,
  });
  return new EventSource(`${BACKEND_DIRECT}/battle/stream?${params.toString()}`);
}
