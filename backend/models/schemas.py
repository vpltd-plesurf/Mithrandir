"""Pydantic models for API requests and responses."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    ollama: str
    models: list[str]
    embedding_model: str
    chat_model: str
    books_ready: int
    books_total: int


class LibraryStats(BaseModel):
    books_ready: int
    books_total: int
    total_words: int
    total_chunks: int


class MatchCandidate(BaseModel):
    catalogue_id: int
    title: str
    confidence: float


class UploadResponse(BaseModel):
    matched: bool
    catalogue_id: int | None = None
    title: str | None = None
    confidence: float = 0.0
    candidates: list[MatchCandidate] = []
    filename: str = ""


class MatchRequest(BaseModel):
    filename: str
    catalogue_id: int


class IngestProgress(BaseModel):
    catalogue_id: int
    title: str
    stage: str  # parsing, chunking, embedding, indexing, complete, error
    progress: float = Field(ge=0.0, le=1.0)
    detail: str = ""
    chunks_created: int = 0
    chunks_total_estimate: int = 0


class CharacterSummary(BaseModel):
    id: int
    canonical_name: str
    race: str | None = None
    aliases: list[str] = []


class CharacterDetail(BaseModel):
    id: int
    canonical_name: str
    race: str | None = None
    gender: str | None = None
    birth_year: str | None = None
    death_year: str | None = None
    description: str | None = None
    first_appearance_book: str | None = None
    notes: str | None = None
    aliases: list[dict] = []  # [{alias, language, context}]
    father: dict | None = None  # {id, canonical_name}
    mother: dict | None = None
    spouse: list[dict] = []
    children: list[dict] = []


class CharacterMention(BaseModel):
    book: str
    chapter: str | None = None
    excerpt: str
    relevance_score: float = 0.0


class GenealogyNode(BaseModel):
    id: int
    canonical_name: str
    relationship: str  # father, mother, spouse, child


class QueryFilters(BaseModel):
    books: list[str] | None = None
    age: str | None = None
    characters: list[str] | None = None


class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class QueryRequest(BaseModel):
    question: str
    filters: QueryFilters | None = None
    top_k: int = 8
    include_sources: bool = True
    history: list[ConversationMessage] = []


class Source(BaseModel):
    index: int
    book: str
    chapter: str
    excerpt: str
    relevance_score: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source] = []
