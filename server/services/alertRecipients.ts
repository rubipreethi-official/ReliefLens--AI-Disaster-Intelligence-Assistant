/**
 * alertRecipients.ts
 *
 * Manages location-based alert recipients stored in MongoDB.
 * These are NOT hardcoded — they are seeded once at startup
 * and can be managed via the DB directly.
 */

import { getCollection } from '../db.js'

export interface AlertRecipient {
  email: string
  name: string
  role: string
  /** Regions this recipient should receive alerts for (case-insensitive match) */
  regions: string[]
  /** Districts this recipient should receive alerts for */
  districts: string[]
  /** Taluks this recipient should receive alerts for */
  taluks: string[]
  /** If true, receives ALL alerts regardless of location */
  isGlobal: boolean
  active: boolean
  addedAt: string
  note?: string
}

const COLLECTION = 'alert_recipients'

/** Seed default recipients on first startup (upsert — safe to run repeatedly). */
export async function seedDefaultRecipients(): Promise<void> {
  const col = await getCollection<AlertRecipient>(COLLECTION)

  const defaults: AlertRecipient[] = [
    {
      email: 'rpofficialcontact@gmail.com',
      name: 'RP Official Contact',
      role: 'Local Authority — Madurai / Chennai',
      regions: ['Tamil Nadu', 'Madurai', 'Thirumangalam', 'Chennai'],
      districts: ['Madurai', 'Chennai'],
      taluks: ['Thirumangalam'],
      isGlobal: false,
      active: true,
      addedAt: new Date().toISOString(),
      note: 'Primary contact for Madurai and Chennai district incidents. Receives Super Critical alerts automatically.',
    },
  ]

  for (const r of defaults) {
    await col.updateOne(
      { email: r.email },
      { $setOnInsert: r },  // only insert if not already present — never overwrite
      { upsert: true }
    )
  }
  console.log('[AlertRecipients] Default recipients seeded.')
}

/**
 * Get all active recipients that should receive an alert for a given location.
 * Matches against district, taluk, region strings (case-insensitive).
 */
export async function getAlertRecipients(opts: {
  district?: string
  taluk?: string
  region?: string
  includeGlobal?: boolean
}): Promise<AlertRecipient[]> {
  const col = await getCollection<AlertRecipient>(COLLECTION)

  const { district = '', taluk = '', region = '', includeGlobal = true } = opts

  const orConditions: Record<string, unknown>[] = []

  if (includeGlobal) {
    orConditions.push({ isGlobal: true })
  }

  if (district) {
    orConditions.push({ districts: { $regex: district, $options: 'i' } })
    orConditions.push({ regions: { $regex: district, $options: 'i' } })
  }
  if (taluk) {
    orConditions.push({ taluks: { $regex: taluk, $options: 'i' } })
    orConditions.push({ regions: { $regex: taluk, $options: 'i' } })
  }
  if (region) {
    orConditions.push({ regions: { $regex: region, $options: 'i' } })
  }

  if (orConditions.length === 0) return []

  const recipients = await col
    .find({ active: true, $or: orConditions })
    .toArray()

  return recipients
}
