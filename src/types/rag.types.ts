/**
 * rag.types.ts
 *
 * Types for the RAG (Retrieval-Augmented Generation) pipeline:
 * - Knowledge base documents
 * - Vector embeddings
 * - MongoDB Atlas Vector Search results
 */

// ─── Knowledge Base Document ──────────────────────────────────────────────────

/** Category of knowledge document stored in MongoDB Atlas */
export type KnowledgeDocumentType =
  | 'severity-rule'
  | 'resource-mapping'
  | 'ics201-protocol'
  | 'historical-incident'
  | 'hazard-classification'

/**
 * A document in the ReliefLens knowledge base.
 * Stored in MongoDB Atlas with a vector embedding for similarity search.
 */
export interface KnowledgeDocument {
  _id?: string
  type: KnowledgeDocumentType
  title: string
  content: string         // The text that was embedded
  source: string          // Attribution: 'ICS 201', 'NDMA India', 'GDACS', etc.
  embedding?: number[]    // 384-dimensional vector (all-MiniLM-L6-v2)
  metadata?: Record<string, string | number | boolean>
  createdAt: string       // ISO 8601
}

// ─── Embedding ────────────────────────────────────────────────────────────────

/** Result of embedding a text string via @xenova/transformers */
export interface EmbeddingResult {
  text: string
  vector: number[]
  dimensions: number    // Should be 384 for all-MiniLM-L6-v2
  latencyMs: number
}

// ─── Vector Search ────────────────────────────────────────────────────────────

/** A single result from MongoDB Atlas Vector Search */
export interface VectorSearchResult {
  _id: string
  content: string
  source: string
  type: KnowledgeDocumentType
  /** Cosine similarity score (0–1, higher = more relevant) */
  score: number
}

/** Options for a vector search query */
export interface VectorSearchOptions {
  limit?: number
  minScore?: number
  filterType?: KnowledgeDocumentType
}

// ─── RAG Context ─────────────────────────────────────────────────────────────

/**
 * The assembled RAG context string injected into the Gemma prompt.
 * Contains retrieved documents formatted as a structured context block.
 */
export interface RAGContext {
  contextString: string
  sourceDocuments: VectorSearchResult[]
  retrievalLatencyMs: number
}
