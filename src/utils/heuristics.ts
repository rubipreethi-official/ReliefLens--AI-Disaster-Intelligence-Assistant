/**
 * heuristics.ts
 *
 * Offline keyword-based severity heuristics engine.
 * Used when Gemma API is unavailable (no connectivity).
 *
 * Returns a provisional severity label — ALWAYS shown as "Provisional" in the UI
 * and upgraded to "AI-Enriched" once connectivity is restored and Gemma processes it.
 *
 * Keywords are curated for disaster contexts in English, Hindi transliterations,
 * and common NGO/NDMA terminology.
 */

import type { Severity } from '@/types/incident.types'

// ─── Keyword Lists ────────────────────────────────────────────────────────────

const CRITICAL_KEYWORDS: readonly string[] = [
  // Structural
  'collapse', 'collapsed', 'building collapse', 'structure collapse', 'buried', 'trapped',
  // Casualties
  'dead', 'death', 'killed', 'fatality', 'casualties', 'mass casualty',
  // Fire
  'fire', 'burning', 'explosion', 'blast',
  // Hazmat
  'gas leak', 'chemical', 'toxic', 'hazmat',
  // Entrapment
  'trapped', 'entrapment', 'rescue needed',
  // Hindi/Tamil transliterations
  'dabaa', 'phansa', 'aag', 'maut',
]

const HIGH_KEYWORDS: readonly string[] = [
  // Injuries
  'injured', 'serious injury', 'critical injury', 'hospital', 'ambulance',
  // Displacement
  'stranded', 'evacuate', 'displacement', 'homeless', 'shelter needed',
  // Flood
  'flood', 'flooding', 'submerged', 'rising water',
  // Infrastructure
  'bridge damage', 'road blocked', 'power outage', 'electricity',
  // Numbers
  '50 people', '100 people', 'hundreds', 'large group',
]

const MEDIUM_KEYWORDS: readonly string[] = [
  // Minor injuries
  'minor injury', 'cut', 'bruise', 'first aid',
  // Small displacement
  'few families', 'small group', '10 people', '20 people',
  // Moderate damage
  'damage', 'damaged', 'broken', 'partial collapse',
  // Manageable
  'manageable', 'under control', 'contained',
]

// LOW is the default when no keywords match

// ─── Engine ───────────────────────────────────────────────────────────────────

interface HeuristicResult {
  severity: Severity
  /** Confidence is always low for heuristics — promotes human review */
  confidence: number
  matchedKeywords: string[]
}

/**
 * Score input text using keyword heuristics.
 * Returns the highest severity found in the text.
 *
 * Confidence is intentionally capped at 0.55 (below the 0.65 review threshold)
 * so provisional cards always enter the human review queue.
 */
export function applyHeuristics(input: string): HeuristicResult {
  const normalized = input.toLowerCase()
  const matchedKeywords: string[] = []

  // Check keywords in order of severity (highest first)
  const criticalMatches = CRITICAL_KEYWORDS.filter(kw => normalized.includes(kw))
  if (criticalMatches.length > 0) {
    return {
      severity: 'critical',
      confidence: Math.min(0.55, 0.35 + criticalMatches.length * 0.05),
      matchedKeywords: criticalMatches,
    }
  }

  const highMatches = HIGH_KEYWORDS.filter(kw => normalized.includes(kw))
  if (highMatches.length > 0) {
    return {
      severity: 'high',
      confidence: Math.min(0.55, 0.30 + highMatches.length * 0.05),
      matchedKeywords: highMatches,
    }
  }

  const mediumMatches = MEDIUM_KEYWORDS.filter(kw => normalized.includes(kw))
  if (mediumMatches.length > 0) {
    return {
      severity: 'medium',
      confidence: Math.min(0.50, 0.25 + mediumMatches.length * 0.05),
      matchedKeywords: mediumMatches,
    }
  }

  // Default: low severity, very low confidence
  return {
    severity: 'low',
    confidence: 0.20,
    matchedKeywords,
  }
}
