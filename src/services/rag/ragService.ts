import { generateEmbedding } from './embeddingService';
import { searchSimilarIncidents } from './vectorStore';
import type { RAGContext, VectorSearchOptions } from '../../types/rag.types';
import { logger } from '../../utils/logger';

/**
 * ragService.ts
 *
 * Orchestrates the Retrieval-Augmented Generation pipeline.
 * Takes a raw user input string, converts it to an embedding, retrieves
 * similar incidents/protocols from the vector store, and formats them
 * into a single context string to be injected into the Gemma prompt.
 */

export async function getRelevantContext(
  userInput: string,
  options: VectorSearchOptions = { limit: 3 }
): Promise<RAGContext | null> {
  const start = performance.now();

  try {
    // 1. Generate vector embedding for the input text
    logger.info('Generating embedding for RAG query...');
    const embeddingResult = await generateEmbedding(userInput);

    // 2. Query MongoDB Atlas Vector Search
    logger.info('Querying vector store for similar incidents...');
    const searchResults = await searchSimilarIncidents(embeddingResult.vector, options);

    if (searchResults.length === 0) {
      return null;
    }

    // 3. Format the retrieved documents into a context string
    let contextString = '';
    searchResults.forEach((doc, index) => {
      contextString += `--- Document ${index + 1} (${doc.type}) ---\n`;
      contextString += `Source: ${doc.source}\n`;
      contextString += `Relevance Score: ${doc.score.toFixed(3)}\n`;
      contextString += `Content:\n${doc.content}\n\n`;
    });

    const retrievalLatencyMs = performance.now() - start;
    logger.info(`RAG retrieval complete in ${retrievalLatencyMs.toFixed(0)}ms`);

    return {
      contextString: contextString.trim(),
      sourceDocuments: searchResults,
      retrievalLatencyMs,
    };
  } catch (error) {
    logger.error('RAG orchestration failed:', error);
    // Fail gracefully: if RAG fails, we return null and the LLM proceeds without context
    return null;
  }
}
