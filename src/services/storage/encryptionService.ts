/**
 * encryptionService.ts
 *
 * AES-256-GCM encryption for sensitive incident data stored in IndexedDB.
 * Uses the native Web Crypto API — no dependencies, works offline.
 *
 * Encryption key is derived from a device-specific seed and stored in
 * sessionStorage. On app restart, key is re-derived (data persists).
 *
 * WARNING: This is client-side encryption for privacy, not security against
 * a determined attacker with device access. It prevents casual data exposure.
 */

import { createLogger } from '@/utils/logger'

const logger = createLogger('encryptionService')

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12  // 96-bit IV for AES-GCM

// ─── Key Management ───────────────────────────────────────────────────────────

let _cachedKey: CryptoKey | null = null

/**
 * Get or generate the AES encryption key for this session.
 * Key is derived from a stable seed stored in localStorage.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (_cachedKey) return _cachedKey

  // Get or create a stable device seed
  const SEED_KEY = 'relieflens-device-seed'
  let seed = localStorage.getItem(SEED_KEY)
  if (!seed) {
    // Generate a random 32-byte seed and store it
    const seedBytes = crypto.getRandomValues(new Uint8Array(32))
    seed = Array.from(seedBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(SEED_KEY, seed)
    logger.info('Generated new device encryption seed')
  }

  // Derive key material from the seed via PBKDF2
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(seed),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const salt = encoder.encode('relieflens-v1-salt')

  _cachedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )

  return _cachedKey
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypt a string (e.g. JSON.stringify'd incident data) and return
 * a base64-encoded ciphertext string (IV prepended).
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  )

  // Prepend IV to ciphertext for storage, then base64 encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a base64-encoded ciphertext string back to the original plaintext.
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey()

  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}
