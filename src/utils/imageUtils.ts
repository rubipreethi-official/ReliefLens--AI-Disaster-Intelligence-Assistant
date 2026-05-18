/**
 * imageUtils.ts
 *
 * Image processing utilities for the ReliefLens intake flow.
 * Handles compression, format conversion, and quality assessment.
 * All operations are client-side — no server upload required.
 */

import { createLogger } from './logger'

const logger = createLogger('imageUtils')

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum dimension (px) before compression is applied */
const MAX_DIMENSION = 1280

/** Target JPEG quality (0–1) after compression */
const JPEG_QUALITY = 0.82

/** Minimum file size (bytes) — below this is likely corrupted */
const MIN_VALID_SIZE = 1000

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Compress an image File or Blob to a base64 JPEG data URI.
 * Resizes to MAX_DIMENSION on the longest side while preserving aspect ratio.
 */
export async function compressImageToBase64(input: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(input)

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const { width, height } = calculateResizedDimensions(img.naturalWidth, img.naturalHeight)
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D context unavailable')

        ctx.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(base64)
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = objectUrl
  })
}

/**
 * Extract raw base64 data (without the data URI prefix) from a data URI.
 * Used when sending image data to the Gemma API.
 */
export function extractBase64Data(dataUri: string): string {
  const commaIndex = dataUri.indexOf(',')
  if (commaIndex === -1) {
    logger.warn('extractBase64Data: no comma found in data URI')
    return dataUri
  }
  return dataUri.slice(commaIndex + 1)
}

/**
 * Detect the MIME type from a data URI.
 * Gemma API requires explicit mime_type for inline_data.
 */
export function getMimeTypeFromDataUri(dataUri: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (dataUri.startsWith('data:image/png')) return 'image/png'
  if (dataUri.startsWith('data:image/webp')) return 'image/webp'
  return 'image/jpeg'  // default — compressed images are always JPEG
}

/**
 * Quick quality check on an image File.
 * Returns 'unusable' for very small files, otherwise 'unknown' (Gemma assesses quality).
 */
export function quickQualityCheck(file: File): 'likely-ok' | 'unusable' {
  if (file.size < MIN_VALID_SIZE) {
    logger.warn(`quickQualityCheck: file too small (${file.size} bytes)`)
    return 'unusable'
  }
  return 'likely-ok'
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function calculateResizedDimensions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  if (originalWidth <= MAX_DIMENSION && originalHeight <= MAX_DIMENSION) {
    return { width: originalWidth, height: originalHeight }
  }

  const ratio = originalWidth > originalHeight
    ? MAX_DIMENSION / originalWidth
    : MAX_DIMENSION / originalHeight

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  }
}
