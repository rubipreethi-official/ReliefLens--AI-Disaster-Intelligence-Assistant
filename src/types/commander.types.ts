/**
 * commander.types.ts
 *
 * Types for the Commander Dashboard layer:
 * - Priority queue management
 * - Resource conflict detection
 * - Audit trail entries
 */

import type { IncidentCard, Severity } from './incident.types'

// ─── Priority Queue ───────────────────────────────────────────────────────────

/**
 * An entry in the commander priority queue.
 * Wraps an IncidentCard with its computed priority score and display metadata.
 */
export interface PriorityQueueEntry {
  incident: IncidentCard
  priorityScore: number
  rank: number                // 1-indexed position in the sorted queue
  isNew: boolean              // True for < 2 minutes old, triggers animation
  requiresImmediateAction: boolean  // severity=critical AND !acknowledgedBy
}

/** Sort options for the priority queue */
export type QueueSortMode = 'priority-score' | 'severity' | 'recency' | 'confidence'

// ─── Resource Conflicts ───────────────────────────────────────────────────────

/**
 * A detected resource conflict: two or more incidents requesting the same
 * resource type when both are at critical/high severity.
 * Commanders must manually resolve — the system only flags, never auto-assigns.
 */
export interface ResourceConflict {
  id: string                  // UUID for this specific conflict
  resourceType: string        // e.g. "Heavy Rescue Team", "Medical Unit"
  conflictingIncidentIds: string[]  // IDs of the competing incidents
  severity: Severity          // Highest severity among the conflicting incidents
  detectedAt: string          // ISO 8601
  resolvedAt?: string         // ISO 8601 — set when commander dismisses
  resolvedBy?: string
}

// ─── Commander State ──────────────────────────────────────────────────────────

/** Overall commander dashboard state */
export interface CommanderState {
  queue: PriorityQueueEntry[]
  conflicts: ResourceConflict[]
  sortMode: QueueSortMode
  selectedIncidentId: string | null
  filterSeverity: Severity | 'all'
  showAcknowledged: boolean
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

/** Full audit log entry with commander action context */
export interface CommanderAuditEntry {
  id: string                  // UUID
  incidentId: string
  timestamp: string           // ISO 8601
  action: CommanderAction
  commander: string           // Display name or 'Unknown Commander'
  notes?: string
  conflictId?: string         // If action resolves a conflict
}

export type CommanderAction =
  | 'acknowledged'
  | 'dispatched-resource'
  | 'escalated'
  | 'resolved-conflict'
  | 'exported-pdf'
  | 'edited-field'
