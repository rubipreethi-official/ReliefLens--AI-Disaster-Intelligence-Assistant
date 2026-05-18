/**
 * contactsData.ts
 *
 * Pre-populated catalogs of professional contacts, emergency responders,
 * and NGOs categorized under standard UNDRR disaster hazard definitions.
 * Used by ARIA and the client-side/RAG layers to instantly enrich incident cards
 * with actionable local telephone numbers and direct outreach emails.
 */

import type { EmergencyContact } from '@/types/incident.types'

export interface DisasterCategoryCatalog {
  category: string
  keywords: string[]
  contacts: EmergencyContact[]
}

export const UNDRR_CONTACT_CATALOGS: DisasterCategoryCatalog[] = [
  {
    category: 'Structural Collapse / Earthquakes',
    keywords: ['collapse', 'earthquake', 'trapped', 'debris', 'rubble', 'structural damage', 'building fall'],
    contacts: [
      {
        name: 'Commander Rajesh Khanna',
        roleOrOrganization: 'NDRF Heavy Urban Search & Rescue',
        phone: '+91 98450 11223',
        email: 'rajesh.khanna@ndrf.gov.in',
        category: 'Heavy Rescue',
      },
      {
        name: 'Dr. Priya Swaminathan',
        roleOrOrganization: 'Trauma & Emergency Care NGO',
        phone: '+91 94432 88771',
        email: 'dr.priya@traumacare-ngo.org',
        category: 'Medical Support',
      },
      {
        name: 'Structural Assessment Cell',
        roleOrOrganization: 'District Disaster Management Authority',
        phone: '+91 44 2859 4321',
        email: 'structures@ddma-relief.gov.in',
        category: 'Technical Experts',
      },
    ],
  },
  {
    category: 'Floods / Mass Displacement',
    keywords: ['flood', 'water', 'submerged', 'stranded', 'rising water', 'inundation', 'cyclone', 'heavy rain'],
    contacts: [
      {
        name: 'Captain Amit Verma',
        roleOrOrganization: 'Rapid Evacuation Flotilla (Navy Reservers)',
        phone: '+91 91765 43210',
        email: 'flotilla.ops@navy-reservers.in',
        category: 'Water Evacuation',
      },
      {
        name: 'Smt. Anita Desai',
        roleOrOrganization: 'Aahar Relief Foundation (Food & Camps)',
        phone: '+91 98201 55443',
        email: 'anita@aahar-relief.org',
        category: 'Logistics & Food',
      },
      {
        name: 'Dr. John Mathew',
        roleOrOrganization: 'Epidemic Prevention Taskforce',
        phone: '+91 94470 12345',
        email: 'jmathew@epidemic-taskforce.org',
        category: 'Public Health',
      },
    ],
  },
  {
    category: 'Industrial / Chemical / Fire Hazards',
    keywords: ['fire', 'smoke', 'gas leak', 'chemical', 'explosion', 'burns', 'toxic', 'industrial accident'],
    contacts: [
      {
        name: 'Chief Fire Officer M. K. Stalin',
        roleOrOrganization: 'State Hazardous Materials Response Team',
        phone: '+91 44 2819 5555',
        email: 'cfo.hazmat@tnfire.gov.in',
        category: 'Hazmat & Fire',
      },
      {
        name: 'Dr. Vikram Sarabhai Ward',
        roleOrOrganization: 'Specialized Burns & Toxicology Unit',
        phone: '+91 98400 99887',
        email: 'burns-unit@state-hospital.org',
        category: 'Specialized Medical',
      },
    ],
  },
]

/**
 * Utility function to retrieve matched contacts for a given text description or incident type.
 */
export function getContactsForIncident(text: string): EmergencyContact[] {
  const lower = text.toLowerCase()
  const matched: EmergencyContact[] = []

  for (const catalog of UNDRR_CONTACT_CATALOGS) {
    const hasMatch = catalog.keywords.some(kw => lower.includes(kw))
    if (hasMatch) {
      matched.push(...catalog.contacts)
    }
  }

  // Fallback to primary heavy rescue and medical if no keyword match
  if (matched.length === 0) {
    matched.push(
      UNDRR_CONTACT_CATALOGS[0].contacts[0],
      UNDRR_CONTACT_CATALOGS[0].contacts[1]
    )
  }

  // Deduplicate by email
  const unique = new Map<string, EmergencyContact>()
  for (const c of matched) {
    unique.set(c.email, c)
  }

  return Array.from(unique.values())
}
