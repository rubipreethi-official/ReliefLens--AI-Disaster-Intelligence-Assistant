/**
 * gemma.config.ts
 *
 * Configuration for the Gemma 4 API integration via Google AI Studio.
 * All values are sourced from environment variables — never hardcoded.
 */

export const GEMMA_CONFIG = {
  /** Google AI Studio API key — set in .env.local */
  apiKey: import.meta.env.VITE_GOOGLE_AI_API_KEY as string,

  /** Base URL for the Gemma API (Generative Language API) */
  endpoint: import.meta.env.VITE_GEMMA_API_ENDPOINT as string ??
    'https://generativelanguage.googleapis.com/v1beta',

  /** Model ID — prioritize VITE_GEMMA_MODEL from .env.local */
  model: import.meta.env.VITE_GEMMA_MODEL as string ?? 'gemma-4-31b-it',

  /** Max tokens for response generation */
  maxOutputTokens: 1024,

  /** Temperature: 0.1 for structured/deterministic JSON extraction */
  temperature: 0.1,

  /** Top-P sampling */
  topP: 0.9,

  /** Request timeout in milliseconds */
  timeoutMs: 30_000,
} as const

export type GemmaConfig = typeof GEMMA_CONFIG
