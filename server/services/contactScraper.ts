import { getCollection } from '../db.js'
import { gemmaGenerateJson } from './gemmaServer.js'
import type { GeocodedLocation } from './geocode.js'

export interface ScrapedContact {
  name: string
  designation: string
  roleOrOrganization: string
  phone: string
  email: string
  category: string
  sourceUrl?: string
  regions: string[]
  countryCode: string
  scrapedAt: string
}

interface ScrapePlan {
  sources: Array<{ url: string; reason: string }>
}

interface ExtractedContactsPayload {
  contacts: Array<{
    name: string
    designation: string
    organization: string
    phone: string
    email: string
    category: string
  }>
}

// ─── Priority sources for Tamil Nadu / India ──────────────────────────────────

const INDIA_TN_SOURCES = [
  'https://tnsdma.tn.gov.in/',               // Tamil Nadu SDMA — primary
  'https://www.tn.gov.in/department/19',      // Revenue & Disaster Mgmt dept
  'https://ndma.gov.in/Resources/disaster-management-contacts',
  'https://www.ndrf.gov.in/',
  'https://www.nhp.gov.in/',
]

const FALLBACK_SOURCES: Record<string, string[]> = {
  IN: INDIA_TN_SOURCES,
  US: ['https://www.fema.gov/', 'https://www.redcross.org/'],
  DEFAULT: ['https://reliefweb.int/', 'https://www.who.int/emergencies'],
}

// ─── TNSDMA hardcoded fallback contacts ───────────────────────────────────────

const TNSDMA_STATIC_CONTACTS: ScrapedContact[] = [
  {
    name: 'TNSDMA State Disaster Helpline',
    designation: 'State Helpline',
    roleOrOrganization: 'Tamil Nadu State Disaster Management Authority',
    phone: '1070',
    email: '',
    category: 'Disaster Management',
    sourceUrl: 'static-tnsdma',
    regions: ['Tamil Nadu', 'India'],
    countryCode: 'IN',
    scrapedAt: new Date().toISOString(),
  },
  {
    name: 'National Emergency Number',
    designation: 'Emergency Hotline',
    roleOrOrganization: 'Government of India',
    phone: '112',
    email: '',
    category: 'Official Support',
    sourceUrl: 'static-fallback',
    regions: ['India'],
    countryCode: 'IN',
    scrapedAt: new Date().toISOString(),
  },
  {
    name: 'NDRF Helpline',
    designation: 'Disaster Response',
    roleOrOrganization: 'National Disaster Response Force',
    phone: '011-24363260',
    email: 'ndrf@nic.in',
    category: 'Disaster Management',
    sourceUrl: 'static-ndrf',
    regions: ['India'],
    countryCode: 'IN',
    scrapedAt: new Date().toISOString(),
  },
]

// ─── Phone / Email Validators ─────────────────────────────────────────────────

function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().]/g, '')
  return /^(\+91|0)?[6-9]\d{9}$/.test(cleaned) || /^\d{3,6}$/.test(cleaned) // include short emergency numbers
}

function isValidGenericPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().+]/g, '')
  return /^\d{4,15}$/.test(cleaned)
}

function isValidEmail(email: string): boolean {
  return /@.+\..+/.test(email) && !email.includes('example.com') && !email.includes('test@')
}

function validatePhone(phone: string, countryCode: string): boolean {
  if (!phone) return false
  return countryCode === 'IN' ? isValidIndianPhone(phone) : isValidGenericPhone(phone)
}

// ─── HTML → structured text (preserving tables) ───────────────────────────────

async function fetchPageSnippet(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReliefLens/1.0; disaster-relief-research)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return ''
    const html = await res.text()

    // Preserve table structure — strip only non-data tags
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<(meta|link|svg|path|img|button|form|input)[^>]*\/?>/gi, ' ')
      // Flatten table structure to readable rows (preserve data)
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/?t[dh][^>]*>/gi, ' | ')
      .replace(/<\/?t(able|head|body|foot|r)[^>]*>/gi, '\n')
      // Strip remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000)  // slightly larger for tables

    return stripped
  } catch {
    return ''
  }
}

// ─── Main Scraper ─────────────────────────────────────────────────────────────

export async function scrapeEmergencyContacts(location: GeocodedLocation): Promise<ScrapedContact[]> {
  console.log(`[Scraper] Starting scrape for: ${location.address} (${location.region}, ${location.country})`)

  // For Tamil Nadu, inject high-value TNSDMA sources at the top
  const isTamilNadu = location.region?.toLowerCase().includes('tamil') ||
    location.address?.toLowerCase().includes('tamil') ||
    location.address?.toLowerCase().includes('madurai') ||
    location.address?.toLowerCase().includes('thirumangalam')

  let plan: ScrapePlan = { sources: [] }
  try {
    plan = await gemmaGenerateJson<ScrapePlan>(
      `You are a disaster relief intelligence planner. Given a user location, list 3-6 authoritative public URLs 
      (government disaster management, civil defence, national emergency numbers, Red Cross/NGO helplines) 
      likely to contain emergency contacts for that region.
      
      For Tamil Nadu, India: prioritise tnsdma.tn.gov.in and tn.gov.in.
      For other Indian districts: include ndma.gov.in, ndrf.gov.in.
      Prefer .gov.in, .nic.in, .gov domains. Avoid Wikipedia.`,
      `Location: ${location.address}
Region: ${location.region}
Country: ${location.country} (${location.countryCode})
Coordinates: ${location.lat}, ${location.lng}

Return JSON: { "sources": [{ "url": "https://...", "reason": "..." }] }`
    )
    console.log(`[Scraper] AI generated ${plan.sources?.length || 0} potential sources.`)
  } catch (err) {
    console.error(`[Scraper] Failed to generate scrape plan:`, err)
  }

  const fallback = isTamilNadu ? INDIA_TN_SOURCES : (FALLBACK_SOURCES[location.countryCode] || FALLBACK_SOURCES.DEFAULT)
  const urls = [
    ...new Set([
      ...(isTamilNadu ? INDIA_TN_SOURCES.slice(0, 2) : []),  // TN sources first
      ...(plan.sources?.map((s) => s.url) || []),
      ...fallback,
    ]),
  ].slice(0, 6)

  const allContacts: ScrapedContact[] = []
  const now = new Date().toISOString()

  for (const url of urls) {
    console.log(`[Scraper] Fetching: ${url}`)
    const snippet = await fetchPageSnippet(url)
    if (!snippet) {
      console.warn(`[Scraper] No content from ${url}`)
      continue
    }
    console.log(`[Scraper] ${snippet.length} chars retrieved from ${url}. Extracting...`)

    try {
      const extracted = await gemmaGenerateJson<ExtractedContactsPayload>(
        `Extract emergency contacts from web page text for disaster relief in ${location.country}.
        Look especially for table rows containing names, phone numbers, and emails.
        Validate Indian phones: must start with +91, 0, or digits 6-9, and be 10 digits (or short codes like 1070, 112).
        Validate emails: must contain @ and a real domain.
        Categories: Official Support, Medical, NGO, Fire, Police, Disaster Management.`,
        `Source URL: ${url}
Region context: ${location.region}, ${location.country}

Page text (including table rows formatted as | col | col |):
${snippet}

Return JSON: { "contacts": [{ "name": "...", "designation": "...", "organization": "...", "phone": "...", "email": "...", "category": "..." }] }
Only include contacts where phone or email is non-empty and valid.`
      )

      for (const c of extracted.contacts || []) {
        const hasValidPhone = validatePhone(c.phone, location.countryCode)
        const hasValidEmail = isValidEmail(c.email)
        if (!hasValidPhone && !hasValidEmail) continue

        const contact: ScrapedContact = {
          name: c.name || 'Emergency Contact',
          designation: c.designation || c.category,
          roleOrOrganization: c.organization || c.category,
          phone: hasValidPhone ? c.phone : '',
          email: hasValidEmail ? c.email : '',
          category: c.category || 'Official Support',
          sourceUrl: url,
          regions: [location.region, location.country],
          countryCode: location.countryCode,
          scrapedAt: now,
        }
        allContacts.push(contact)
      }
      console.log(`[Scraper] Extracted ${allContacts.length} valid contacts so far.`)
    } catch (err) {
      console.error(`[Scraper] Extraction failed for ${url}:`, err)
    }
  }

  // If scraping yielded nothing, synthesise via AI
  if (allContacts.length === 0) {
    console.log(`[Scraper] No contacts from scraping. Synthesising AI fallback for ${location.country}...`)
    try {
      const synthesized = await gemmaGenerateJson<ExtractedContactsPayload>(
        `Provide verified emergency disaster relief contacts for the given region.
        Use real national emergency numbers (India 112, 1070 for Tamil Nadu SDMA).`,
        `Country: ${location.country} (${location.countryCode}), Region: ${location.region}
Return JSON with at least 4 contacts: police (100), fire (101), ambulance (102), disaster management (1070 for TN).`
      )
      for (const c of synthesized.contacts || []) {
        allContacts.push({
          name: c.name || 'Emergency Line',
          designation: c.designation || 'Hotline',
          roleOrOrganization: c.organization || 'Emergency Services',
          phone: c.phone || '',
          email: c.email || '',
          category: c.category || 'Official Support',
          sourceUrl: 'gemma-curated',
          regions: [location.region, location.country],
          countryCode: location.countryCode,
          scrapedAt: now,
        })
      }
    } catch (err) {
      console.error(`[Scraper] AI synthesis failed:`, err)
    }
  }

  // Final hardcoded fallback for Tamil Nadu / India
  if (allContacts.length === 0) {
    console.log(`[Scraper] All methods failed. Using static emergency numbers.`)
    const staticNow = new Date().toISOString()
    const statics = isTamilNadu
      ? TNSDMA_STATIC_CONTACTS.map((c) => ({ ...c, scrapedAt: staticNow }))
      : [
          { name: 'National Emergency', designation: 'Hotline', roleOrOrganization: 'Gov', phone: '112', email: '', category: 'Official Support', sourceUrl: 'static-fallback', regions: [location.region, location.country], countryCode: location.countryCode, scrapedAt: staticNow },
          { name: 'Police', designation: 'Emergency', roleOrOrganization: 'Official', phone: '100', email: '', category: 'Official Support', sourceUrl: 'static-fallback', regions: [location.region, location.country], countryCode: location.countryCode, scrapedAt: staticNow },
          { name: 'Fire Station', designation: 'Emergency', roleOrOrganization: 'Official', phone: '101', email: '', category: 'Fire', sourceUrl: 'static-fallback', regions: [location.region, location.country], countryCode: location.countryCode, scrapedAt: staticNow },
          { name: 'Ambulance', designation: 'Emergency', roleOrOrganization: 'Medical', phone: '102', email: '', category: 'Medical', sourceUrl: 'static-fallback', regions: [location.region, location.country], countryCode: location.countryCode, scrapedAt: staticNow },
        ]
    allContacts.push(...statics)
  }

  // Save to DB
  console.log(`[Scraper] Saving ${allContacts.length} contacts to database...`)
  try {
    const col = await getCollection<ScrapedContact>('emergency_contacts')
    for (const contact of allContacts) {
      await col.updateOne(
        { phone: contact.phone, roleOrOrganization: contact.roleOrOrganization, countryCode: contact.countryCode },
        { $set: contact },
        { upsert: true }
      )
    }
    console.log(`[Scraper] Saved successfully.`)
  } catch (err) {
    console.error(`[Scraper] DB save error:`, err)
  }

  return allContacts
}

export async function seedDefaultContacts(): Promise<void> {
  const col = await getCollection<ScrapedContact>('emergency_contacts')
  const now = new Date().toISOString()
  
  const defaults: ScrapedContact[] = [
    {
      name: 'RP Official Contact',
      designation: 'Local Authority',
      roleOrOrganization: 'Madurai District Administration',
      phone: '+919444000000', // standard format
      email: 'rpofficialcontact@gmail.com',
      category: 'Official Support',
      sourceUrl: 'manual-seed',
      regions: ['Madurai', 'Thirumangalam', 'Tamil Nadu'],
      countryCode: 'IN',
      scrapedAt: now,
    },
  ]

  for (const c of defaults) {
    await col.updateOne(
      { email: c.email },
      { $setOnInsert: c },
      { upsert: true }
    )
  }
  console.log('[Scraper] Default contacts seeded.')
}

export async function getContactsForLocation(
  region: string,
  countryCode?: string
): Promise<ScrapedContact[]> {
  const col = await getCollection<ScrapedContact>('emergency_contacts')
  const filter: Record<string, unknown> = {
    $or: [
      { regions: { $regex: region, $options: 'i' } },
      { roleOrOrganization: { $regex: region, $options: 'i' } },
    ],
  }
  if (countryCode) filter.countryCode = countryCode
  return col.find(filter).limit(20).toArray()
}
