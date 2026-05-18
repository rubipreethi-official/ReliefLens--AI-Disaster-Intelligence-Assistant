import { getCollection } from '../db.js'
import { gemmaGenerateJson } from './gemmaServer.js'

export interface FirstAidGuide {
  disasterType: string
  sourceOrganization: string
  sourceUrl?: string
  steps: string[]
  doNot: string[]
  whenToSeekCare: string[]
  region?: string
  scrapedAt: string
}

interface FirstAidPayload {
  disasterType: string
  sourceOrganization: string
  sourceUrl?: string
  steps: string[]
  doNot: string[]
  whenToSeekCare: string[]
}

const CERTIFIED_ORGS = [
  'WHO',
  'Red Cross / Red Crescent',
  'CDC',
  'FEMA',
  'National Disaster Management Authority',
]

export async function scrapeFirstAidForDisaster(
  disasterType: string,
  region?: string
): Promise<FirstAidGuide> {
  const guide = await gemmaGenerateJson<FirstAidPayload>(
    `You are a medical information assistant citing certified organizations (WHO, Red Cross, CDC, FEMA, NDMA).
    Provide first-aid guidance for the specified disaster type. Be concise, actionable, and safety-focused.
    Do not invent specific drug dosages. Prefer evacuation and stabilization steps.`,
    `Disaster type: ${disasterType}
Region: ${region || 'global'}
Reference organizations: ${CERTIFIED_ORGS.join(', ')}

Return JSON:
{
  "disasterType": "...",
  "sourceOrganization": "WHO / Red Cross / ...",
  "sourceUrl": "optional official URL",
  "steps": ["step 1", ...],
  "doNot": ["..."],
  "whenToSeekCare": ["..."]
}`
  )

  const record: FirstAidGuide = {
    ...guide,
    disasterType: guide.disasterType || disasterType,
    region,
    scrapedAt: new Date().toISOString(),
  }

  const col = await getCollection<FirstAidGuide>('first_aid_guides')
  await col.updateOne(
    { disasterType: record.disasterType, region: region || 'global' },
    { $set: record },
    { upsert: true }
  )

  return record
}

export async function getFirstAidGuide(
  disasterType: string,
  region?: string
): Promise<FirstAidGuide | null> {
  const col = await getCollection<FirstAidGuide>('first_aid_guides')
  const exact = await col.findOne({
    disasterType: { $regex: `^${disasterType}$`, $options: 'i' },
    ...(region ? { region } : {}),
  })
  if (exact) return exact
  return col.findOne({ disasterType: { $regex: disasterType, $options: 'i' } })
}
