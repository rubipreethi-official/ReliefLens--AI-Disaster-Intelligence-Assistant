/**
 * syncService.ts
 *
 * Manages the offline → online sync pipeline:
 * 1. When offline: saves incidents to IndexedDB with 'provisional' status
 * 2. When connectivity restores: processes sync queue, calls Gemma for enrichment
 * 3. After enrichment: updates incident in IndexedDB with 'ai-enriched' status
 */

import { db } from './db'
import { enrichIncident } from '@/services/gemma/gemmaClient'
import { backendApi } from '@/services/api/backendClient'
import { calculatePriorityScore, requiresHumanReview } from '@/services/prioritisation/priorityEngine'
import { nowISO } from '@/utils/dateUtils'
import { createLogger } from '@/utils/logger'
import type { IncidentCard } from '@/types/incident.types'

const logger = createLogger('syncService')

// ─── Sync Queue Management ────────────────────────────────────────────────────

/** Add a new incident to the offline queue for later enrichment */
export async function queueForSync(incident: IncidentCard): Promise<void> {
  await db.syncQueue.add({
    incidentId: incident.id,
    operation: 'create',
    payload: JSON.stringify(incident),
    createdAt: nowISO(),
    retryCount: 0,
  })
  logger.info(`Queued incident ${incident.id} for sync`)
}

/** Process all pending sync queue items — call Gemma and update IndexedDB */
export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  const pending = await db.syncQueue
    .where('operation').equals('create')
    .and(item => item.retryCount < 3)
    .toArray()

  if (pending.length === 0) {
    logger.debug('Sync queue empty — nothing to process')
    return { processed: 0, failed: 0 }
  }

  logger.info(`Processing ${pending.length} sync queue items...`)
  let processed = 0
  let failed = 0

  for (const queueItem of pending) {
    try {
      const incident: IncidentCard = JSON.parse(queueItem.payload)

      const enrichResult = await enrichIncident({
        photoBase64: incident.photoBase64,
        voiceTranscript: incident.voiceTranscript,
        textInput: incident.textInput,
      })

      if (!enrichResult.success) {
        throw new Error(enrichResult.error)
      }

      // Merge enriched data back into the incident
      const { extracted } = enrichResult.result
      const enrichedIncident: IncidentCard = {
        ...incident,
        severity: extracted.severity,
        confidence: extracted.confidence,
        who: extracted.who ?? incident.who,
        what: extracted.what,
        where: extracted.where ?? incident.where,
        urgency_flags: extracted.urgency_flags ?? [],
        suggested_resources: extracted.suggested_resources ?? [],
        image_quality: extracted.image_quality,
        failure_notes: extracted.failure_notes,
        status: 'ai-enriched',
        updatedAt: nowISO(),
        priorityScore: 0,  // Will be recalculated below
        requiresReview: false,
      }

      enrichedIncident.priorityScore = calculatePriorityScore(enrichedIncident)
      enrichedIncident.requiresReview = requiresHumanReview(enrichedIncident)

      // Append audit entry
      enrichedIncident.auditLog.push({
        timestamp: nowISO(),
        action: 'enriched',
        actor: 'ai',
        notes: `Gemma enrichment completed in ${enrichResult.result.latencyMs}ms`,
      })

      // Update IndexedDB
      await db.incidents.put(enrichedIncident)

      // Sync to MongoDB
      try {
        await backendApi.saveIncident(enrichedIncident)
        logger.info(`Synced incident ${incident.id} to MongoDB`)
      } catch (err) {
        logger.warn(`MongoDB sync failed for incident ${incident.id}:`, err)
      }

      // Remove from sync queue
      if (queueItem.id !== undefined) {
        await db.syncQueue.delete(queueItem.id)
      }

      processed++
      logger.info(`Enriched incident ${incident.id} successfully`)
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error(`Failed to sync incident ${queueItem.incidentId}:`, message)

      // Increment retry count
      if (queueItem.id !== undefined) {
        await db.syncQueue.update(queueItem.id, {
          retryCount: queueItem.retryCount + 1,
          lastError: message,
        })
      }
    }
  }

  return { processed, failed }
}
