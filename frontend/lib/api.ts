import type {
  BookPreview,
  CharacterDetail,
  CharacterGraph,
  CharactersResponse,
  HealthStatus,
  LibraryResponse,
  LibraryStats,
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
  filters?: { books?: string[]; characters?: string[]; locations?: string[]; top_k?: number }
): EventSource {
  const params = new URLSearchParams({ question });
  if (filters?.books?.length) {
    params.set("books", filters.books.join(","));
  }
  if (filters?.characters?.length) {
    params.set("characters", filters.characters.join(","));
  }
  if (filters?.locations?.length) {
    params.set("locations", filters.locations.join(","));
  }
  if (filters?.top_k) {
    params.set("top_k", String(filters.top_k));
  }
  return new EventSource(`${BACKEND_DIRECT}/query/stream?${params.toString()}`);
}

// --- Battle ---

export function battleStream(characterA: string, characterB: string): EventSource {
  const params = new URLSearchParams({
    character_a: characterA,
    character_b: characterB,
  });
  return new EventSource(`${BACKEND_DIRECT}/battle/stream?${params.toString()}`);
}
