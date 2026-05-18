/**
 * conflictDetector.ts
 *
 * Detects resource conflicts between incidents in the priority queue.
 * A conflict exists when 2+ incidents at critical/high severity share
 * a resource type. Commanders must manually resolve — this system only flags.
 */

import type { IncidentCard } from '@/types/incident.types'
import type { ResourceConflict } from '@/types/commander.types'
import { CONFLICT_SEVERITY_THRESHOLD } from '@/config/constants'
import { nowISO } from '@/utils/dateUtils'
import { createLogger } from '@/utils/logger'

const logger = createLogger('conflictDetector')

// ─── Conflict Detection ───────────────────────────────────────────────────────

/**
 * Scan a list of incidents and return all detected resource conflicts.
 * Only incidents with severity in CONFLICT_SEVERITY_THRESHOLD are checked.
 *
 * Algorithm: Group incidents by each suggested resource.
 * If a resource group has 2+ qualifying incidents → conflict raised.
 */
export function detectResourceConflicts(incidents: IncidentCard[]): ResourceConflict[] {
  // Filter to only critical/high incidents that haven't been resolved
  const qualifyingIncidents = incidents.filter(
    inc =>
      CONFLICT_SEVERITY_THRESHOLD.includes(inc.severity) &&
      !inc.acknowledgedBy
  )

  if (qualifyingIncidents.length < 2) return []

  // Build a map: resource → list of incident IDs requesting it
  const resourceMap = new Map<string, string[]>()

  for (const incident of qualifyingIncidents) {
    for (const resource of incident.suggested_resources) {
      const normalized = resource.trim().toLowerCase()
      if (!resourceMap.has(normalized)) {
        resourceMap.set(normalized, [])
      }
      resourceMap.get(normalized)!.push(incident.id)
    }
  }

  // Any resource requested by 2+ incidents is a conflict
  const conflicts: ResourceConflict[] = []

  for (const [resourceType, incidentIds] of resourceMap.entries()) {
    if (incidentIds.length >= 2) {
      // Find the highest severity among conflicting incidents
      const conflictingIncidents = qualifyingIncidents.filter(
        inc => incidentIds.includes(inc.id)
      )
      const highestSeverity = conflictingIncidents.reduce(
        (highest, inc) => {
          const order = { critical: 4, high: 3, medium: 2, low: 1 }
          return order[inc.severity] > order[highest] ? inc.severity : highest
        },
        'low' as IncidentCard['severity']
      )

      conflicts.push({
        id: generateConflictId(),
        resourceType: toTitleCase(resourceType),
        conflictingIncidentIds: incidentIds,
        severity: highestSeverity,
        detectedAt: nowISO(),
      })

      logger.warn(`Conflict detected: "${resourceType}" requested by ${incidentIds.length} incidents`)
    }
  }

  return conflicts
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateConflictId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp-based ID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}
