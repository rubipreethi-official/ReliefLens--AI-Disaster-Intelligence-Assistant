import type { EmergencyContact } from '@/types/incident.types'
import { logger } from '@/utils/logger'

const DATA_API_URL = import.meta.env.VITE_MONGODB_DATA_API_URL
const DATA_API_KEY = import.meta.env.VITE_MONGODB_DATA_API_KEY
const DATA_SOURCE = import.meta.env.VITE_MONGODB_DATA_SOURCE || import.meta.env.VITE_MONGODB_CLUSTER_NAME || 'Cluster0'
const DATABASE_NAME = import.meta.env.VITE_MONGODB_DB || 'relieflens'
const COLLECTION_NAME = import.meta.env.VITE_MONGODB_CONTACTS_COLLECTION || 'contacts'

/**
 * Query Atlas Data API for persisted local response contacts.
 * If no Data API configuration exists, returns [] and leaves callers to use local fallback data.
 */
export async function fetchContactsFromMongo(location: string): Promise<EmergencyContact[]> {
  if (!DATA_API_URL || !DATA_API_KEY) {
    logger.warn('MongoDB Data API not configured. Skipping remote contact lookup.')
    return []
  }

  const normalized = location.trim()
  if (!normalized) {
    return []
  }

  const filter = {
    $or: [
      { regions: { $regex: normalized, $options: 'i' } },
      { roleOrOrganization: { $regex: normalized, $options: 'i' } },
      { name: { $regex: normalized, $options: 'i' } },
      { category: { $regex: normalized, $options: 'i' } },
    ],
  }

  const payload = {
    dataSource: DATA_SOURCE,
    database: DATABASE_NAME,
    collection: COLLECTION_NAME,
    filter,
    limit: 10,
  }

  try {
    const response = await fetch(`${DATA_API_URL}/action/find`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': DATA_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('MongoDB Data API error:', response.status, errorText)
      return []
    }

    const data = await response.json()
    return (data.documents || []) as EmergencyContact[]
  } catch (error) {
    logger.error('Failed to query MongoDB contacts:', error)
    return []
  }
}

export async function persistContactsToMongo(contacts: EmergencyContact[]): Promise<void> {
  if (!DATA_API_URL || !DATA_API_KEY) {
    logger.warn('MongoDB Data API not configured. Skipping remote persistence.')
    return
  }

  const upsertPromises = contacts.map(async (contact) => {
    try {
      await fetch(`${DATA_API_URL}/action/updateOne`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': DATA_API_KEY,
        },
        body: JSON.stringify({
          dataSource: DATA_SOURCE,
          database: DATABASE_NAME,
          collection: COLLECTION_NAME,
          filter: { email: contact.email },
          update: { $set: contact },
          upsert: true,
        }),
      })
    } catch (error) {
      logger.error('Failed to persist contact to MongoDB:', error)
    }
  })

  await Promise.all(upsertPromises)
}
