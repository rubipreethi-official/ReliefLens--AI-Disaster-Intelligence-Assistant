const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `API ${response.status}`)
  }
  return response.json() as Promise<T>
}

export interface GeocodedLocation {
  lat: number
  lng: number
  address: string
  region: string
  country: string
  countryCode: string
}

export interface BackendContact {
  name: string
  designation: string
  roleOrOrganization: string
  phone: string
  email: string
  category: string
}

export interface DisasterFeedItem {
  id: string
  title: string
  summary: string
  source: string
  sourceUrl: string
  publishedAt: string
}

export interface FirstAidGuide {
  disasterType: string
  sourceOrganization: string
  sourceUrl?: string
  steps: string[]
  doNot: string[]
  whenToSeekCare: string[]
}

export const backendApi = {
  reverseGeocode: (lat: number, lng: number) =>
    apiFetch<GeocodedLocation>('/api/location/reverse', {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    }),

  scrapeContacts: (lat: number, lng: number) =>
    apiFetch<{ location: GeocodedLocation; contacts: BackendContact[] }>(
      '/api/contacts/scrape',
      { method: 'POST', body: JSON.stringify({ lat, lng }) }
    ),

  getContacts: (region: string, countryCode?: string) =>
    apiFetch<{ contacts: BackendContact[] }>(
      `/api/contacts?region=${encodeURIComponent(region)}${countryCode ? `&countryCode=${countryCode}` : ''}`
    ),

  getRecentDisasters: () =>
    apiFetch<{ items: DisasterFeedItem[] }>('/api/disasters/recent'),

  getFirstAid: (disasterType: string, region?: string) =>
    apiFetch<{ guide: FirstAidGuide }>(
      `/api/first-aid/${encodeURIComponent(disasterType)}${region ? `?region=${encodeURIComponent(region)}` : ''}`
    ),

  getCalmingPrompt: (language: string, phase: string) =>
    apiFetch<{ text: string }>('/api/aria/calming-prompt', {
      method: 'POST',
      body: JSON.stringify({ language, phase }),
    }),

  sendCriticalReport: (
    payload: Record<string, unknown>,
    region: string,
    countryCode?: string
  ) =>
    apiFetch<{ sent: string[]; failed: string[]; superCriticalSent: boolean }>('/api/incidents/critical-report', {
      method: 'POST',
      body: JSON.stringify({ payload, region, countryCode }),
    }),
  saveIncident: (incident: any) =>
    apiFetch<{ ok: boolean }>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    }),
}
