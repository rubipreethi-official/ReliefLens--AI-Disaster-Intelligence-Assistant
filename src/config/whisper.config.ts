/**
 * whisper.config.ts
 *
 * Configuration for the on-device Whisper WASM speech-to-text engine.
 * Model files must be downloaded and placed in public/whisper/ before use.
 * See CP-3 in the README for setup instructions.
 */

export const WHISPER_CONFIG = {
  /**
   * Path to the Whisper GGML model file served from the public directory.
   * Uses ggml-tiny for speed (75 MB) — sufficient for disaster triage keywords.
   */
  modelPath: '/whisper/ggml-tiny.bin',

  /** Language hint — 'auto' enables multilingual detection (Tamil, Hindi, etc.) */
  language: 'auto' as const,

  /** Max audio duration in seconds to process per transcription call */
  maxDurationSeconds: 30,

  /** Translate non-English transcriptions to English for Gemma analysis */
  translate: false,

  /** Number of threads for WASM execution (tune per device capability) */
  threads: 4,
} as const

export type WhisperConfig = typeof WHISPER_CONFIG
