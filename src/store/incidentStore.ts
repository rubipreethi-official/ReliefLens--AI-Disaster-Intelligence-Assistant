/**
 * incidentStore.ts
 *
 * Zustand store for incident CRUD operations.
 * All mutations write to IndexedDB via the db instance.
 * Reactive state is kept in memory for fast UI updates.
 */

import { create } from 'zustand'
import { db } from '@/services/storage/db'
import { queueForSync } from '@/services/storage/syncService'
import { applyHeuristics } from '@/utils/heuristics'
import { calculatePriorityScore, requiresHumanReview } from '@/services/prioritisation/priorityEngine'
import { nowISO } from '@/utils/dateUtils'
import { createLogger } from '@/utils/logger'
import type { IncidentCard, DraftIncident } from '@/types/incident.types'

const logger = createLogger('incidentStore')

// ─── State Shape ──────────────────────────────────────────────────────────────

interface IncidentStoreState {
  incidents: IncidentCard[]
  isLoading: boolean
  error: string | null
  userLocation: { lat: number; lng: number; address?: string; region?: string; country?: string; countryCode?: string } | null
  currentLanguage: string
  availableLanguages: string[]

  // Actions
  loadAll: () => Promise<void>
  setIncidents: (incidents: IncidentCard[]) => void
  setUserLocation: (loc: { lat: number; lng: number; address?: string; region?: string; country?: string; countryCode?: string } | null) => void
  setLanguage: (lang: string) => void
  setAvailableLanguages: (langs: string[]) => void
  createFromDraft: (draft: DraftIncident, isOnline: boolean) => Promise<IncidentCard>
  updateIncident: (id: string, updates: Partial<IncidentCard>) => Promise<void>
  acknowledgeIncident: (id: string, responderName: string) => Promise<void>
  deleteIncident: (id: string) => Promise<void>
  clearError: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `inc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useIncidentStore = create<IncidentStoreState>((set, get) => ({
  incidents: [],
  isLoading: false,
  error: null,
  userLocation: null,
  currentLanguage: 'English',
  availableLanguages: ['English'],

  /** Load all incidents from IndexedDB into memory */
  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const all = await db.incidents.orderBy('createdAt').reverse().toArray()
      set({ incidents: all, isLoading: false })
      logger.info(`Loaded ${all.length} incidents from IndexedDB`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load incidents'
      logger.error('loadAll failed:', message)
      set({ error: message, isLoading: false })
    }
  },

  setIncidents: (incidents) => set({ incidents }),

  setUserLocation: (loc) => set({ userLocation: loc }),
  setLanguage: (lang) => set({ currentLanguage: lang }),
  setAvailableLanguages: (langs) => set({ availableLanguages: langs }),

  /**
   * Create a new incident from a draft (intake flow output).
   * - If online: saves provisional + queues for Gemma enrichment
   * - If offline: saves provisional with heuristic severity
   */
  createFromDraft: async (draft: DraftIncident, isOnline: boolean) => {
    const rawText = [draft.voiceTranscript, draft.textInput].filter(Boolean).join(' ')
    const heuristic = applyHeuristics(rawText || '')

    const now = nowISO()
    const incident: IncidentCard = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      severity: heuristic.severity,
      confidence: heuristic.confidence,
      who: {
        count: 0,
        condition: 'Unknown — awaiting AI analysis',
        confidence: 0,
        incident_type: '',
        damage_scale: 'none',
        hazards: [],
      } as IncidentCard['who'],
      what: {
        incident_type: 'Unclassified — awaiting AI analysis',
        damage_scale: 'none',
        hazards: [],
        confidence: heuristic.confidence,
      },
      where: {
        description: 'Unknown — awaiting AI analysis',
        confidence: 0,
      },
      urgency_flags: [],
      suggested_resources: [],
      status: 'provisional',
      priorityScore: 0,
      requiresReview: true,
      auditLog: [
        {
          timestamp: now,
          action: 'created',
          actor: 'field-responder',
          notes: `Heuristic severity: ${heuristic.severity} (keywords: ${heuristic.matchedKeywords.join(', ') || 'none'})`,
        },
      ],
      ...draft,
    }

    incident.priorityScore = calculatePriorityScore(incident)
    incident.requiresReview = requiresHumanReview(incident)

    // Save to IndexedDB
    await db.incidents.add(incident)

    // Queue for enrichment when online
    if (isOnline) {
      await queueForSync(incident)
    }

    // Update in-memory state
    set(state => ({ incidents: [incident, ...state.incidents] }))
    logger.info(`Created incident ${incident.id} (status: provisional, online: ${isOnline})`)

    return incident
  },

  /** Update fields on an existing incident */
  updateIncident: async (id: string, updates: Partial<IncidentCard>) => {
    const updated = { ...updates, updatedAt: nowISO() }
    await db.incidents.update(id, updated)

    set(state => ({
      incidents: state.incidents.map(inc =>
        inc.id === id ? { ...inc, ...updated } : inc
      ),
    }))
  },

  /** Mark an incident as acknowledged by a named responder */
  acknowledgeIncident: async (id: string, responderName: string) => {
    const now = nowISO()
    const updates: Partial<IncidentCard> = {
      acknowledgedBy: responderName,
      acknowledgedAt: now,
      updatedAt: now,
    }

    // Append audit entry
    const incident = get().incidents.find(i => i.id === id)
    if (incident) {
      updates.auditLog = [
        ...incident.auditLog,
        { timestamp: now, action: 'acknowledged', actor: responderName },
      ]
    }

    await db.incidents.update(id, updates)
    set(state => ({
      incidents: state.incidents.map(inc =>
        inc.id === id ? { ...inc, ...updates } : inc
      ),
    }))

    logger.info(`Incident ${id} acknowledged by ${responderName}`)
  },

  /** Permanently delete an incident from IndexedDB and memory */
  deleteIncident: async (id: string) => {
    await db.incidents.delete(id)
    set(state => ({ incidents: state.incidents.filter(inc => inc.id !== id) }))
    logger.info(`Incident ${id} deleted`)
  },

  clearError: () => set({ error: null }),
}))
