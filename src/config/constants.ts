/**
 * constants.ts
 *
 * Application-wide constants for the ReliefLens priority engine, severity
 * thresholds, and configuration values. Values here mirror the README spec.
 * Change these to tune the system — no other files need updating.
 */

// ─── Priority Score Weights ──────────────────────────────────────────────────
// Formula: (Severity × 0.5) + (Confidence × 0.3) + (TimeDecay × 0.2)
export const PRIORITY_WEIGHT_SEVERITY = 0.5
export const PRIORITY_WEIGHT_CONFIDENCE = 0.3
export const PRIORITY_WEIGHT_TIME_DECAY = 0.2

// ─── Severity Score Values ───────────────────────────────────────────────────
export const SEVERITY_SCORES = {
  critical: 1.0,
  high: 0.75,
  medium: 0.50,
  low: 0.25,
} as const

// ─── Confidence Modifiers ─────────────────────────────────────────────────────
// Below REVIEW_THRESHOLD → flagged for human review, removed from auto-queue
export const CONFIDENCE_HIGH_THRESHOLD = 0.85  // 1.0 modifier
export const CONFIDENCE_MID_THRESHOLD = 0.65   // 0.85 modifier
// Below 0.65 → 0 modifier (human must review)
export const CONFIDENCE_REVIEW_THRESHOLD =
  parseFloat(import.meta.env.VITE_CONFIDENCE_REVIEW_THRESHOLD ?? '0.65')

// ─── Time Decay ───────────────────────────────────────────────────────────────
// Each 10 minutes without acknowledgement adds 0.05 urgency, capped at 0.3
export const TIME_DECAY_PER_10_MINUTES = 0.05
export const TIME_DECAY_CAP = 0.3

// ─── Auto-Delete Policy ───────────────────────────────────────────────────────
export const AUTO_DELETE_DAYS =
  parseInt(import.meta.env.VITE_AUTO_DELETE_DAYS ?? '30', 10)

// ─── App Identity ─────────────────────────────────────────────────────────────
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'ReliefLens'
export const APP_VERSION = '0.1.0'

// ─── Resource Conflict ───────────────────────────────────────────────────────
// A conflict is raised when 2+ Critical/High incidents share a resource type
export const CONFLICT_SEVERITY_THRESHOLD: readonly string[] = ['critical', 'high']

// ─── IndexedDB ───────────────────────────────────────────────────────────────
export const DB_NAME = 'relieflens-db'
export const DB_VERSION = 1

// ─── Map Defaults ────────────────────────────────────────────────────────────
// Default map center (India — primary deployment context)
export const MAP_DEFAULT_LAT = 20.5937
export const MAP_DEFAULT_LNG = 78.9629
export const MAP_DEFAULT_ZOOM = 5
export const MAP_CLUSTER_ZOOM = 12

// ─── Gemma API ───────────────────────────────────────────────────────────────
export const GEMMA_API_ENDPOINT =
  import.meta.env.VITE_GEMMA_API_ENDPOINT ??
  'https://generativelanguage.googleapis.com/v1beta'
export const GEMMA_MODEL =
  import.meta.env.VITE_GEMMA_MODEL ?? 'gemma-2.0-flash-exp'

// ─── Severity Color Map ───────────────────────────────────────────────────────
// CSS variable names defined in index.css and tailwind.config.js
export const SEVERITY_COLORS = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
} as const

// ─── Advisory Label ──────────────────────────────────────────────────────────
// All AI-generated outputs must display this label in the UI
export const AI_ADVISORY_LABEL = 'Suggested — verify before acting'
