/**
 * incident.types.ts
 *
 * Core domain types for the ReliefLens incident card system.
 * These types represent the structured output of Gemma's analysis
 * and the data model stored in IndexedDB.
 *
 * ALL AI-generated fields carry a confidence score (0.0–1.0).
 */

// ─── Enumerations ─────────────────────────────────────────────────────────────

/** Severity levels — used for priority scoring and color coding */
export type Severity = 'critical' | 'high' | 'medium' | 'low'

/** Damage scale vocabulary for structural/environmental incidents */
export type DamageScale = 'none' | 'minor' | 'moderate' | 'major' | 'catastrophic'

/** Image quality assessment by Gemma vision */
export type ImageQuality = 'good' | 'poor' | 'unusable'

/**
 * Processing label applied to an incident card:
 * - provisional: offline-only, heuristic keyword scoring
 * - ai-enriched: sent through Gemma API, fully structured
 * - reviewed: manually confirmed by a responder or commander
 */
export type IncidentStatus = 'provisional' | 'ai-enriched' | 'reviewed'

// ─── Sub-structures ───────────────────────────────────────────────────────────

/** Who is affected — victim count, condition, and confidence */
export interface WhoData {
  count: number
  condition: string
  confidence: number
}

/** What happened — incident type, damage scale, hazards */
export interface WhatData {
  incident_type: string
  damage_scale: DamageScale
  hazards: string[]
  confidence: number
}

/** Where it happened — textual description + optional GPS coordinates */
export interface WhereData {
  description: string
  lat?: number
  lng?: number
  confidence: number
}

/** A single audit entry for the chain of custody */
export interface AuditEntry {
  timestamp: string  // ISO 8601
  action: 'created' | 'enriched' | 'edited' | 'acknowledged' | 'dispatched'
  actor: string      // responder name / 'system' / 'ai'
  notes?: string
}

/** Professional or NGO contact details retrieved via RAG for incident response */
export interface EmergencyContact {
  name: string
  roleOrOrganization: string
  phone: string
  email: string
  category: string
}

// ─── Primary Entity ───────────────────────────────────────────────────────────

/**
 * IncidentCard — the central data model.
 * Created at intake (provisional), upgraded after AI enrichment.
 * Stored encrypted in IndexedDB; synced to backend when online.
 */
export interface IncidentCard {
  /** UUID v4, generated client-side at intake */
  id: string

  /** ISO 8601 timestamp when this incident was first captured */
  createdAt: string

  /** ISO 8601 timestamp of last modification */
  updatedAt: string

  /** Number of minutes since intake (computed field, not stored) */
  minutesSinceIntake?: number

  // ─── Core AI-extracted fields ─────────────────────────────────
  severity: Severity
  confidence: number           // overall confidence (0.0–1.0)

  who: WhatData extends never ? never : WhoData
  what: WhatData
  where: WhereData

  /** Urgency flags raised by Gemma (e.g. "fire risk", "gas leak detected") */
  urgency_flags: string[]

  /** Advisory resources suggested by Gemma — MUST be labelled as advisory in UI */
  suggested_resources: string[]

  /** Retrieved professional contacts/NGOs mapped to the incident requirements */
  contacts?: EmergencyContact[]

  /** Image quality if photo was provided */
  image_quality?: ImageQuality

  /** Notes from Gemma about why it is uncertain */
  failure_notes?: string

  // ─── Input sources ────────────────────────────────────────────
  /** Base64-encoded original photo (if any) */
  photoBase64?: string

  /** Whisper transcription of voice input (if any) */
  voiceTranscript?: string

  /** Raw text input pasted by responder (if any) */
  textInput?: string

  // ─── Processing state ─────────────────────────────────────────
  status: IncidentStatus

  /** Priority score calculated by priorityEngine.ts */
  priorityScore: number

  /** True if confidence < REVIEW_THRESHOLD — requires human confirmation */
  requiresReview: boolean

  /** Responder who acknowledged this incident */
  acknowledgedBy?: string

  /** ISO 8601 timestamp of acknowledgement */
  acknowledgedAt?: string

  /** Audit trail: all actions taken on this card */
  auditLog: AuditEntry[]
}

/** Partial incident used during intake flow (before enrichment) */
export type DraftIncident = Pick<IncidentCard, 'photoBase64' | 'voiceTranscript' | 'textInput'>
