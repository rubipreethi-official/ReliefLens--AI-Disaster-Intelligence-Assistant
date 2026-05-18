/**
 * commanderStore.ts
 *
 * Zustand store for the Commander Dashboard.
 * Manages: priority queue, resource conflicts, sort/filter state.
 */

import { create } from 'zustand'
import { detectResourceConflicts } from '@/services/prioritisation/conflictDetector'
import { calculatePriorityScore } from '@/services/prioritisation/priorityEngine'
import { createLogger } from '@/utils/logger'
import type { IncidentCard, Severity } from '@/types/incident.types'
import type {
  CommanderState,
  PriorityQueueEntry,
  QueueSortMode,
} from '@/types/commander.types'
import { minutesSince } from '@/utils/dateUtils'

const logger = createLogger('commanderStore')

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface CommanderStoreState extends CommanderState {
  // Actions
  rebuildQueue: (incidents: IncidentCard[]) => void
  setSelectedIncident: (id: string | null) => void
  setSortMode: (mode: QueueSortMode) => void
  setFilterSeverity: (severity: Severity | 'all') => void
  setShowAcknowledged: (show: boolean) => void
  resolveConflict: (conflictId: string, resolvedBy: string) => void
  dismissConflict: (conflictId: string) => void
}

// ─── Queue Builder ────────────────────────────────────────────────────────────

function buildQueueEntries(
  incidents: IncidentCard[],
  sortMode: QueueSortMode,
  filterSeverity: Severity | 'all',
  showAcknowledged: boolean
): PriorityQueueEntry[] {
  let filtered = incidents

  // Apply severity filter
  if (filterSeverity !== 'all') {
    filtered = filtered.filter(inc => inc.severity === filterSeverity)
  }

  // Hide acknowledged unless requested
  if (!showAcknowledged) {
    filtered = filtered.filter(inc => !inc.acknowledgedBy)
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortMode) {
      case 'priority-score':
        return calculatePriorityScore(b) - calculatePriorityScore(a)
      case 'severity': {
        const order = { critical: 4, high: 3, medium: 2, low: 1 }
        return order[b.severity] - order[a.severity]
      }
      case 'recency':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'confidence':
        return b.confidence - a.confidence
      default:
        return 0
    }
  })

  return sorted.map((incident, index) => ({
    incident,
    priorityScore: calculatePriorityScore(incident),
    rank: index + 1,
    isNew: minutesSince(incident.createdAt) < 2,
    requiresImmediateAction:
      incident.severity === 'critical' && !incident.acknowledgedBy,
  }))
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCommanderStore = create<CommanderStoreState>((set, get) => ({
  queue: [],
  conflicts: [],
  sortMode: 'priority-score',
  selectedIncidentId: null,
  filterSeverity: 'all',
  showAcknowledged: false,

  /** Rebuild priority queue and detect conflicts from updated incident list */
  rebuildQueue: (incidents: IncidentCard[]) => {
    const { sortMode, filterSeverity, showAcknowledged } = get()
    const queue = buildQueueEntries(incidents, sortMode, filterSeverity, showAcknowledged)
    const conflicts = detectResourceConflicts(incidents)

    if (conflicts.length > 0) {
      logger.warn(`Detected ${conflicts.length} resource conflict(s)`)
    }

    set({ queue, conflicts })
  },

  setSelectedIncident: (id) => set({ selectedIncidentId: id }),

  setSortMode: (mode) => {
    const { queue } = get()
    // Re-sort existing queue entries
    const resorted = [...queue].sort((a, b) => {
      switch (mode) {
        case 'priority-score': return b.priorityScore - a.priorityScore
        case 'severity': {
          const order = { critical: 4, high: 3, medium: 2, low: 1 }
          return order[b.incident.severity] - order[a.incident.severity]
        }
        case 'recency':
          return new Date(b.incident.createdAt).getTime() - new Date(a.incident.createdAt).getTime()
        case 'confidence':
          return b.incident.confidence - a.incident.confidence
        default: return 0
      }
    }).map((entry, i) => ({ ...entry, rank: i + 1 }))

    set({ sortMode: mode, queue: resorted })
  },

  setFilterSeverity: (severity) => set({ filterSeverity: severity }),
  setShowAcknowledged: (show) => set({ showAcknowledged: show }),

  resolveConflict: (conflictId, resolvedBy) => {
    set(state => ({
      conflicts: state.conflicts.map(c =>
        c.id === conflictId
          ? { ...c, resolvedAt: new Date().toISOString(), resolvedBy }
          : c
      ),
    }))
  },

  dismissConflict: (conflictId) => {
    set(state => ({
      conflicts: state.conflicts.filter(c => c.id !== conflictId),
    }))
  },
}))
