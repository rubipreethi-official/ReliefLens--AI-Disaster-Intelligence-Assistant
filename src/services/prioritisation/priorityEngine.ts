/**
 * priorityEngine.ts
 *
 * Calculates the priority score for an incident card.
 * Formula (from README): (Severity × 0.5) + (Confidence × 0.3) + (TimeDecay × 0.2)
 *
 * Incidents with confidence below REVIEW_THRESHOLD receive a 0 modifier
 * and are excluded from the automatic priority queue.
 */

import type { IncidentCard } from '@/types/incident.types'
import {
  SEVERITY_SCORES,
  PRIORITY_WEIGHT_SEVERITY,
  PRIORITY_WEIGHT_CONFIDENCE,
  PRIORITY_WEIGHT_TIME_DECAY,
  CONFIDENCE_HIGH_THRESHOLD,
  CONFIDENCE_MID_THRESHOLD,
  CONFIDENCE_REVIEW_THRESHOLD,
  TIME_DECAY_PER_10_MINUTES,
  TIME_DECAY_CAP,
} from '@/config/constants'
import { minutesSince } from '@/utils/dateUtils'
import { createLogger } from '@/utils/logger'

const logger = createLogger('priorityEngine')

// ─── Sub-calculations ─────────────────────────────────────────────────────────

/**
 * Convert a confidence score (0–1) into a weighted modifier.
 * Below review threshold → 0 (card requires human review, not auto-queued).
 */
function confidenceModifier(confidence: number): number {
  if (confidence >= CONFIDENCE_HIGH_THRESHOLD) return 1.0
  if (confidence >= CONFIDENCE_MID_THRESHOLD) return 0.85
  if (confidence >= CONFIDENCE_REVIEW_THRESHOLD) return 0.60
  return 0  // Below threshold: excluded from auto-queue, flagged for review
}

/**
 * Time decay urgency boost.
 * Each 10 minutes without acknowledgement adds 0.05, capped at 0.3.
 */
function timeDecay(minutesOld: number): number {
  return Math.min(
    (minutesOld / 10) * TIME_DECAY_PER_10_MINUTES,
    TIME_DECAY_CAP
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Calculate the priority score for an IncidentCard.
 *
 * @returns A score in the range [0, 1] where 1 = highest priority.
 *          Returns 0 if confidence is below the review threshold.
 */
export function calculatePriorityScore(incident: IncidentCard): number {
  const severityScore = SEVERITY_SCORES[incident.severity]
  const confModifier = confidenceModifier(incident.confidence)

  // If confidence is below threshold, remove from auto-queue
  if (confModifier === 0) {
    logger.debug(`Incident ${incident.id} below confidence threshold — flagged for review`)
    return 0
  }

  const ageMinutes = minutesSince(incident.createdAt)
  const decayBoost = timeDecay(ageMinutes)

  const score =
    (severityScore * PRIORITY_WEIGHT_SEVERITY) +
    (confModifier * PRIORITY_WEIGHT_CONFIDENCE) +
    (decayBoost * PRIORITY_WEIGHT_TIME_DECAY)

  return Math.min(1, Math.round(score * 1000) / 1000)  // 3 decimal precision, max 1
}

/**
 * Determine if an incident requires human review before action.
 * True when: confidence < REVIEW_THRESHOLD OR status is 'provisional'.
 */
export function requiresHumanReview(incident: IncidentCard): boolean {
  return (
    incident.confidence < CONFIDENCE_REVIEW_THRESHOLD ||
    incident.status === 'provisional'
  )
}
