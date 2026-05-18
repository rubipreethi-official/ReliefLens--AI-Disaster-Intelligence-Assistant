/**
 * db.ts
 *
 * Dexie.js IndexedDB schema for ReliefLens offline-first storage.
 * Three tables: incidents, syncQueue, auditLog.
 *
 * All sensitive fields are stored as encrypted blobs — see encryptionService.ts.
 * The encryption/decryption happens in syncService.ts, not here.
 */

import Dexie, { type Table } from 'dexie'
import type { IncidentCard } from '@/types/incident.types'
import type { CommanderAuditEntry } from '@/types/commander.types'
import { DB_NAME, DB_VERSION } from '@/config/constants'

// ─── Sync Queue Item ──────────────────────────────────────────────────────────

/**
 * An item waiting to be synced with the backend when connectivity is restored.
 * Holds the incident ID and the operation type.
 */
export interface SyncQueueItem {
  id?: number          // Auto-increment primary key
  incidentId: string
  operation: 'create' | 'update' | 'delete'
  payload: string      // JSON stringified IncidentCard (encrypted)
  createdAt: string    // ISO 8601
  retryCount: number
  lastError?: string
}

// ─── Database Class ───────────────────────────────────────────────────────────

class ReliefLensDB extends Dexie {
  incidents!: Table<IncidentCard>
  syncQueue!: Table<SyncQueueItem>
  auditLog!: Table<CommanderAuditEntry>

  constructor() {
    super(DB_NAME)

    this.version(DB_VERSION).stores({
      // Primary table — indexed by id, status, severity, and creation time
      // (non-indexed fields are still stored but not searchable by index)
      incidents: 'id, status, severity, priorityScore, createdAt, acknowledgedBy',

      // Sync queue — indexed by operation type and creation time
      syncQueue: '++id, incidentId, operation, createdAt, retryCount',

      // Audit log — indexed by incident and timestamp for reporting
      auditLog: 'id, incidentId, timestamp, action',
    })
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/**
 * Singleton database instance.
 * Import this directly in services — do NOT create new instances.
 */
export const db = new ReliefLensDB()
