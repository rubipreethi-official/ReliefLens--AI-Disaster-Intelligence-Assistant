import express from 'express'
import cors from 'cors'
import { SERVER_CONFIG } from './config.js'
import { reverseGeocode } from './services/geocode.js'
import {
  scrapeEmergencyContacts,
  getContactsForLocation,
  seedDefaultContacts,
} from './services/contactScraper.js'
import {
  scrapeFirstAidForDisaster,
  getFirstAidGuide,
} from './services/firstAidScraper.js'
import { fetchRecentDisasters } from './services/disasterFeed.js'
import { sendCriticalReport } from './services/emailService.js'
import { gemmaGenerateText } from './services/gemmaServer.js'
import { getDb } from './db.js'
import { seedDefaultRecipients, getAlertRecipients } from './services/alertRecipients.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'relieflens-api' })
})

app.post('/api/location/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.body
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng required' })
    }
    const location = await reverseGeocode(lat, lng)
    res.json(location)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Geocode failed' })
  }
})

app.get('/api/contacts', async (req, res) => {
  try {
    const region = String(req.query.region || '')
    const countryCode = req.query.countryCode ? String(req.query.countryCode) : undefined
    const contacts = await getContactsForLocation(region, countryCode)
    res.json({ contacts })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load contacts' })
  }
})

app.post('/api/contacts/scrape', async (req, res) => {
  try {
    const { lat, lng } = req.body
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng required' })
    }
    const location = await reverseGeocode(lat, lng)
    const contacts = await scrapeEmergencyContacts(location)
    res.json({ location, contacts })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Scrape failed' })
  }
})

app.get('/api/first-aid/:disasterType', async (req, res) => {
  try {
    const disasterType = decodeURIComponent(req.params.disasterType)
    const region = req.query.region ? String(req.query.region) : undefined
    let guide = await getFirstAidGuide(disasterType, region)
    if (!guide) {
      guide = await scrapeFirstAidForDisaster(disasterType, region)
    }
    res.json({ guide })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'First aid lookup failed' })
  }
})

app.post('/api/first-aid/scrape', async (req, res) => {
  try {
    const { disasterType, region } = req.body
    if (!disasterType) return res.status(400).json({ error: 'disasterType required' })
    const guide = await scrapeFirstAidForDisaster(disasterType, region)
    res.json({ guide })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Scrape failed' })
  }
})

app.get('/api/disasters/recent', async (_req, res) => {
  try {
    const items = await fetchRecentDisasters()
    res.json({ items })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Feed failed' })
  }
})

app.post('/api/incidents', async (req, res) => {
  try {
    const incident = req.body
    if (!incident.id) return res.status(400).json({ error: 'Incident ID required' })
    const db = await getDb()
    const col = db.collection('incidents')
    await col.updateOne({ id: incident.id }, { $set: incident }, { upsert: true })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Save failed' })
  }
})

app.post('/api/aria/calming-prompt', async (req, res) => {
  try {
    const { language, phase } = req.body
    const text = await gemmaGenerateText(
      `You are ARIA, a calm disaster response voice assistant. Generate ONE short spoken sentence (max 25 words).
      Be emotionally supportive. No preamble. Same language as requested.`,
      `Language: ${language || 'English'}
Phase: ${phase || 'greeting'}
If phase is greeting: welcome and ask what happened.
If phase is listening: acknowledge and ask one clarifying question.
If phase is confirmed: reassure that help is dispatched.`,
      { temperature: 0.6, maxTokens: 128 }
    )
    res.json({ text: text.trim() })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Prompt failed' })
  }
})

app.post('/api/incidents/critical-report', async (req, res) => {
  try {
    const { payload, region, countryCode } = req.body
    if (!payload?.incidentId) {
      return res.status(400).json({ error: 'payload with incidentId required' })
    }

    // Set timestamp if not provided
    if (!payload.timestamp) {
      payload.timestamp = new Date().toISOString()
    }

    // Resolve district from region if not set
    if (!payload.district && region) {
      payload.district = region
    }

    // Fetch scraped contacts and DB alert recipients in parallel
    const [contacts, alertRecipients] = await Promise.all([
      getContactsForLocation(region || '', countryCode),
      getAlertRecipients({
        district: payload.district || region || '',
        taluk: payload.taluk || '',
        region: region || '',
        includeGlobal: true,
      }),
    ])

    const result = await sendCriticalReport(contacts, payload, alertRecipients)

    console.log(`[API] Critical report: sent=${result.sent.length}, failed=${result.failed.length}, superCritical=${result.superCriticalSent}`)
    if (result.sent.length > 0) console.log('[API] Sent to:', result.sent)
    if (result.failed.length > 0) console.error('[API] Failed:', result.failed)

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Email failed' })
  }
})

app.listen(SERVER_CONFIG.port, async () => {
  console.log(`ReliefLens API listening on http://localhost:${SERVER_CONFIG.port}`)
  try {
    await getDb()
    console.log('[Startup] Database connection verified.')
    // Seed default alert recipients (idempotent)
    await seedDefaultRecipients()
    // Seed default emergency contacts (idempotent)
    await seedDefaultContacts()
  } catch (err) {
    console.error('[Startup] Database connection FAILED:', err instanceof Error ? err.message : err)
  }
})
