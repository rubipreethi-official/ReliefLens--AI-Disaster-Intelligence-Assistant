/**
 * validators.ts
 *
 * Input validation helpers for incident data and user inputs.
 * Returns typed Result objects — no thrown exceptions in validation paths.
 */

import type { Severity, DamageScale } from '@/types/incident.types'

// ─── Result Type ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  error?: string
}

const ok = (): ValidationResult => ({ valid: true })
const fail = (error: string): ValidationResult => ({ valid: false, error })

// ─── Validators ───────────────────────────────────────────────────────────────

/** Check if a value is a valid Severity level */
export function isValidSeverity(value: unknown): value is Severity {
  return typeof value === 'string' &&
    ['critical', 'high', 'medium', 'low'].includes(value)
}

/** Check if a value is a valid DamageScale level */
export function isValidDamageScale(value: unknown): value is DamageScale {
  return typeof value === 'string' &&
    ['none', 'minor', 'moderate', 'major', 'catastrophic'].includes(value)
}

/** Check if a confidence value is within valid range [0, 1] */
export function validateConfidence(value: unknown): ValidationResult {
  if (typeof value !== 'number') return fail('Confidence must be a number')
  if (value < 0 || value > 1) return fail('Confidence must be between 0.0 and 1.0')
  return ok()
}

/** Validate that at least one input source is provided for intake */
export function validateIntakeInput(
  photo?: string,
  voice?: string,
  text?: string
): ValidationResult {
  if (!photo && !voice && !text) {
    return fail('At least one input (photo, voice, or text) is required')
  }
  if (text && text.trim().length < 5) {
    return fail('Text input is too short to analyze')
  }
  return ok()
}

/** Validate GPS coordinates */
export function validateCoordinates(lat: number, lng: number): ValidationResult {
  if (lat < -90 || lat > 90) return fail('Latitude must be between -90 and 90')
  if (lng < -180 || lng > 180) return fail('Longitude must be between -180 and 180')
  return ok()
}

/** Check if a base64 image string appears valid (has data URI prefix) */
export function validateBase64Image(data: string): ValidationResult {
  if (!data.startsWith('data:image/')) {
    return fail('Invalid image format — expected data URI')
  }
  if (data.length < 100) {
    return fail('Image data appears to be empty or corrupted')
  }
  return ok()
}
