export interface Book {
  id: number;
  catalogue_id: number;
  title: string;
  short_title: string | null;
  author: string;
  editor: string | null;
  publication_year: number | null;
  tier: number;
  tier_label: string;
  era_covered: string | null;
  estimated_words: number | null;
  actual_words: number | null;
  format: string | null;
  file_path: string | null;
  total_chapters: number | null;
  chunk_count: number;
  status: "missing" | "uploaded" | "ingesting" | "ready" | "error";
  error_message: string | null;
}

export interface TierGroup {
  tier: number;
  tier_label: string;
  books: Book[];
}

export interface LibraryResponse {
  tiers: TierGroup[];
  books: Book[];
}

export interface LibraryStats {
  books_ready: number;
  books_total: number;
  total_words: number;
  total_chunks: number;
}

export interface HealthStatus {
  status: string;
  ollama: string;
  models: string[];
  embedding_model: string;
  chat_model: string;
  books_ready: number;
  books_total: number;
}

export interface Source {
  index: number;
  book: string;
  chapter: string;
  excerpt: string;
  relevance_score: number;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

export interface MatchCandidate {
  catalogue_id: number;
  title: string;
  confidence: number;
}

export interface UploadResponse {
  matched: boolean;
  catalogue_id: number | null;
  title: string | null;
  confidence: number;
  candidates: MatchCandidate[];
  filename: string;
}

export interface IngestProgress {
  catalogue_id: number;
  title: string;
  stage: "parsing" | "chunking" | "embedding" | "indexing" | "complete" | "error";
  progress: number;
  detail: string;
  chunks_created: number;
  chunks_total_estimate: number;
}

export interface BookPreview {
  catalogue_id: number;
  title: string;
  filename: string;
  format: string;
  chapters: { title: string; excerpt: string }[];
  preview: string;
}

export interface CharacterSummary {
  id: number;
  canonical_name: string;
  race: string | null;
  aliases: string[];
}

export interface CharactersResponse {
  characters: CharacterSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface CharacterAlias {
  alias: string;
  language: string | null;
  context: string | null;
}

export interface CharacterDetail {
  id: number;
  canonical_name: string;
  race: string | null;
  gender: string | null;
  birth_year: string | null;
  death_year: string | null;
  description: string | null;
  first_appearance_book: string | null;
  notes: string | null;
  aliases: CharacterAlias[];
  father: { id: number; canonical_name: string } | null;
  mother: { id: number; canonical_name: string } | null;
  children: { id: number; canonical_name: string }[];
  spouse: { id: number; canonical_name: string }[];
}

export interface GraphNode {
  id: number;
  name: string;
  race: string | null;
}

export interface GraphEdge {
  source: number;
  target: number;
  type: "parent" | "spouse";
}

export interface CharacterGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CharacterMention {
  book: string;
  chapter: string | null;
  excerpt: string;
  relevance_score: number;
}

export interface Location {
  id: number;
  name: string;
  region: string | null;
  type: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LocationMention {
  book: string;
  chapter: string | null;
  excerpt: string;
  relevance_score: number;
}

export interface TimelineEvent {
  id: number;
  name: string;
  age: string;
  year: string;
  year_sortable: number;
  description: string | null;
  source_book: string | null;
  source_chapter: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "searching" | "reasoning" | "answering";
  sources?: Source[];
  timestamp: Date;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}
