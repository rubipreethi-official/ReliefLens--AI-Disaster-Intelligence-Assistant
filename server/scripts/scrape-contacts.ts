/**
 * CLI: Scrape emergency contacts for a location and store in MongoDB.
 * Usage: npx tsx server/scripts/scrape-contacts.ts [lat] [lng]
 */
import { SERVER_CONFIG } from '../config.js'
import { reverseGeocode } from '../services/geocode.js'
import { scrapeEmergencyContacts } from '../services/contactScraper.js'
import { closeDb } from '../db.js'

async function main() {
  const lat = Number(process.argv[2] || 13.0827)
  const lng = Number(process.argv[3] || 80.2707)

  if (!SERVER_CONFIG.googleApiKey) {
    console.error('Missing GOOGLE_AI_API_KEY / VITE_GOOGLE_AI_API_KEY in .env.local')
    process.exit(1)
  }
  if (!SERVER_CONFIG.mongoUri) {
    console.error('Missing MONGODB_URI / VITE_MONGODB_URI in .env.local')
    process.exit(1)
  }

  console.log(`Geocoding ${lat}, ${lng}...`)
  const location = await reverseGeocode(lat, lng)
  console.log(`Region: ${location.region}, ${location.country}`)

  console.log('Scraping contacts with Gemma...')
  const contacts = await scrapeEmergencyContacts(location)
  console.log(`Stored ${contacts.length} contacts in emergency_contacts collection.`)

  contacts.forEach((c) => {
    console.log(`- ${c.roleOrOrganization}: ${c.phone} ${c.email}`)
  })

  await closeDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
