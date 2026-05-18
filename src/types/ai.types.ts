/**
 * ai.types.ts
 *
 * Types for all AI service interactions:
 * - Gemma 4 API request/response shapes
 * - Whisper WASM transcription results
 * - Function calling schemas and parsed results
 */

import type { Severity, ImageQuality, WhoData, WhatData, WhereData, EmergencyContact } from './incident.types'

// ─── Gemma API ────────────────────────────────────────────────────────────────

/** A single content part in a Gemma message (text or inline image) */
export interface GemmaContentPart {
  text?: string
  inline_data?: {
    mime_type: 'image/jpeg' | 'image/png' | 'image/webp'
    data: string  // base64-encoded image data
  }
}

/** A message in the Gemma conversation format */
export interface GemmaMessage {
  role: 'user' | 'model'
  parts: GemmaContentPart[]
}

/** Full request body sent to the Gemma generateContent endpoint */
export interface GemmaRequest {
  contents: GemmaMessage[]
  tools?: GemmaTool[]
  systemInstruction?: {
    parts: [{ text: string }]
  }
  generationConfig?: {
    temperature?: number
    topP?: number
    maxOutputTokens?: number
  }
}

/** A single Gemma tool (function declaration) */
export interface GemmaTool {
  function_declarations: GemmaFunctionDeclaration[]
}

/** JSON Schema-compatible function declaration for Gemma function calling */
export interface GemmaFunctionDeclaration {
  name: string
  description: string
  parameters: GemmaFunctionParameters
}

/** JSON Schema object for function parameters */
export interface GemmaFunctionParameters {
  type: 'object'
  properties: Record<string, GemmaParameterSchema>
  required?: string[]
}

/** A single parameter schema (recursive for nested objects/arrays) */
export interface GemmaParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: string[]
  minimum?: number
  maximum?: number
  items?: GemmaParameterSchema
  properties?: Record<string, GemmaParameterSchema>
}

/** Raw response from the Gemma API */
export interface GemmaRawResponse {
  candidates: GemmaCandidate[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export interface GemmaCandidate {
  content: {
    role: 'model'
    parts: GemmaResponsePart[]
  }
  finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER'
  safetyRatings?: GemmaSafetyRating[]
}

export interface GemmaResponsePart {
  text?: string
  functionCall?: GemmaFunctionCall
}

export interface GemmaFunctionCall {
  name: string
  args: Record<string, unknown>
}

export interface GemmaSafetyRating {
  category: string
  probability: string
}

// ─── Parsed / typed function call result ──────────────────────────────────────

/**
 * The structured output from Gemma's extract_incident_data function call.
 * Matches the JSON schema in functionSchemas.ts exactly.
 */
export interface ExtractedIncidentData {
  severity: Severity
  confidence: number
  who?: WhoData
  what: WhatData
  where?: WhereData
  urgency_flags?: string[]
  suggested_resources?: string[]
  contacts?: EmergencyContact[]
  image_quality?: ImageQuality
  failure_notes?: string
}

/** Wrapper for any function call result with error handling */
export interface FunctionCallResult<T = ExtractedIncidentData> {
  success: boolean
  data?: T
  rawArgs?: Record<string, unknown>
  error?: string
}

/** Full enrichment result returned by gemmaClient.enrichIncident() */
export interface GemmaEnrichmentResult {
  extracted: ExtractedIncidentData
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
  latencyMs: number
}

// ─── Whisper WASM ─────────────────────────────────────────────────────────────

/** Result from a Whisper transcription call */
export interface WhisperTranscriptionResult {
  text: string           // full transcription text
  language: string       // detected language code (e.g. 'ta', 'en', 'hi')
  segments?: WhisperSegment[]
  durationSeconds: number
}

/** A single time-aligned segment from Whisper */
export interface WhisperSegment {
  start: number   // seconds
  end: number     // seconds
  text: string
}

/** Loading state for the Whisper model (downloaded on first use) */
export type WhisperLoadState = 'idle' | 'loading' | 'ready' | 'error'
