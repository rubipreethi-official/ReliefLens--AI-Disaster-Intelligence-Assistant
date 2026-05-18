/**
 * locationService.ts
 *
 * Handles GPS geolocation, reverse geocoding, and regional language detection.
 */

import { createLogger } from '@/utils/logger'
import { backendApi, type GeocodedLocation } from '@/services/api/backendClient'

const logger = createLogger('locationService')

export interface UserLocation {
  lat: number
  lng: number
  address?: string
  region?: string
  country?: string
  countryCode?: string
}

/**
 * Get the current GPS position of the user.
 */
export async function getCurrentPosition(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      logger.error('Geolocation is not supported by this browser.')
      reject(new Error('Geolocation not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        logger.info(`GPS coordinates captured: ${latitude}, ${longitude}`)

        try {
          const geo = await backendApi.reverseGeocode(latitude, longitude)
          resolve({
            lat: latitude,
            lng: longitude,
            address: geo.address,
            region: geo.region,
            country: geo.country,
            countryCode: geo.countryCode,
          })
        } catch {
          resolve({ lat: latitude, lng: longitude })
        }
      },
      (error) => {
        logger.error('Error capturing GPS coordinates:', error.message)
        reject(error)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  })
}

/**
 * Trigger backend contact scrape for the user's coordinates.
 */
export async function scrapeContactsForLocation(loc: UserLocation): Promise<void> {
  try {
    await backendApi.scrapeContacts(loc.lat, loc.lng)
    logger.info('Emergency contacts scraped for region')
  } catch (err) {
    logger.warn('Contact scrape skipped (is API server running?):', err)
  }
}

/**
 * Detect regional languages based on coordinates.
 */
export async function getRegionalLanguages(lat: number, lng: number): Promise<string[]> {
  if (lat > 8 && lat < 14 && lng > 76 && lng < 81) {
    return ['Tamil', 'English']
  }
  return [
    'English',
    'Hindi',
    'Bengali',
    'Telugu',
    'Marathi',
    'Tamil',
    'Urdu',
    'Gujarati',
    'Kannada',
    'Odia',
    'Malayalam',
    'Punjabi',
  ]
}

export type { GeocodedLocation }
