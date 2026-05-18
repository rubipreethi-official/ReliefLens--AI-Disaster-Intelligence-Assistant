/// <reference types="vite/client" />
import type { VectorSearchResult, VectorSearchOptions } from '../../types/rag.types';
import { logger } from '../../utils/logger';

/**
 * vectorStore.ts
 *
 * Handles queries to MongoDB Atlas Vector Search.
 * Since this is a browser-only PWA, we use the MongoDB Atlas Data API (HTTPS)
 * rather than the Node.js `mongodb` driver to avoid pulling in Node core modules.
 */

const DATA_API_URL = import.meta.env.VITE_MONGODB_DATA_API_URL;
const DATA_API_KEY = import.meta.env.VITE_MONGODB_DATA_API_KEY;
const CLUSTER_NAME = import.meta.env.VITE_MONGODB_CLUSTER_NAME || 'Cluster0';
const DATABASE_NAME = import.meta.env.VITE_MONGODB_DB || 'relieflens';
const COLLECTION_NAME = import.meta.env.VITE_MONGODB_COLLECTION || 'knowledge_base';

export async function searchSimilarIncidents(
  embedding: number[],
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  if (!DATA_API_URL || !DATA_API_KEY) {
    logger.warn('MongoDB Data API not configured. Returning empty RAG context.');
    return [];
  }

  const limit = options.limit || 3;

  const payload = {
    dataSource: CLUSTER_NAME,
    database: DATABASE_NAME,
    collection: COLLECTION_NAME,
    pipeline: [
      {
        $vectorSearch: {
          index: 'relieflens_vector_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 50,
          limit: limit,
        },
      },
      {
        $project: {
          content: 1,
          source: 1,
          type: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ],
  };

  try {
    const response = await fetch(`${DATA_API_URL}/action/aggregate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': DATA_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Atlas Data API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    return data.documents as VectorSearchResult[];
  } catch (error) {
    logger.error('Failed to query vector store:', error);
    return [];
  }
}
