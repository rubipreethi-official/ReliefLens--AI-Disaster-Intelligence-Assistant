/**
 * dateUtils.ts
 *
 * Date and time helpers for the ReliefLens priority engine and UI display.
 */

/** Return the number of minutes elapsed since a given ISO 8601 timestamp */
export function minutesSince(isoTimestamp: string): number {
  const created = new Date(isoTimestamp).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - created) / 60_000))
}

/** Format a timestamp for display in the commander dashboard */
export function formatRelativeTime(isoTimestamp: string): string {
  const minutes = minutesSince(isoTimestamp)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Format an ISO timestamp as a short human-readable date + time */
export function formatDateTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Return a new ISO 8601 timestamp for "now" */
export function nowISO(): string {
  return new Date().toISOString()
}

/** Check if an incident is older than the auto-delete threshold */
export function isExpiredForDeletion(isoTimestamp: string, maxDays: number): boolean {
  const ageMs = Date.now() - new Date(isoTimestamp).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  return ageDays >= maxDays
}
