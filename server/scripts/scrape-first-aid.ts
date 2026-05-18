/**
 * CLI: Generate first-aid guides for disaster types via Gemma.
 * Usage: npx tsx server/scripts/scrape-first-aid.ts "flood" "Chennai"
 */
import { SERVER_CONFIG } from '../config.js'
import { scrapeFirstAidForDisaster } from '../services/firstAidScraper.js'
import { closeDb } from '../db.js'

async function main() {
  const disasterType = process.argv[2] || 'flood'
  const region = process.argv[3]

  if (!SERVER_CONFIG.googleApiKey) {
    console.error('Missing API key in .env.local')
    process.exit(1)
  }

  console.log(`Generating first-aid guide for: ${disasterType}${region ? ` (${region})` : ''}`)
  const guide = await scrapeFirstAidForDisaster(disasterType, region)
  console.log(JSON.stringify(guide, null, 2))
  await closeDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
