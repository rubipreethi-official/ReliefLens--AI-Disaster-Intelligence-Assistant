import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';
import type { EmbeddingResult } from '../../types/rag.types';
import { logger } from '../../utils/logger';

// Configure transformers to only use the network when models aren't cached
env.allowLocalModels = false;

// We use all-MiniLM-L6-v2, which generates 384-dimensional vectors
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let extractor: FeatureExtractionPipeline | null = null;
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Initializes the embedding model.
 * Downloads the model on first run (cached in IndexedDB via Web Worker/browser cache).
 */
export async function initExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  if (extractorPromise) return extractorPromise;

  try {
    extractorPromise = pipeline('feature-extraction', MODEL_NAME) as Promise<FeatureExtractionPipeline>;
    extractor = await extractorPromise;
    logger.info('Embedding model initialized successfully');
    return extractor;
  } catch (error) {
    logger.error('Failed to initialize embedding model', error);
    extractorPromise = null;
    throw new Error('Failed to load embedding model. Please check your network connection.');
  }
}

/**
 * Converts text to a 384-dimensional vector embedding.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const start = performance.now();
  const model = await initExtractor();
  
  try {
    // Generate embedding
    const output = await model(text, {
      pooling: 'mean',
      normalize: true,
    });

    const vector = Array.from(output.data) as number[];
    const latencyMs = performance.now() - start;

    return {
      text,
      vector,
      dimensions: vector.length,
      latencyMs
    };
  } catch (error) {
    logger.error('Error generating embedding', error);
    throw new Error('Could not generate embedding for the provided text.');
  }
}
