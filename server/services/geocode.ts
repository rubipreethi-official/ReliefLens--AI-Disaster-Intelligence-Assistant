export interface GeocodedLocation {
  lat: number
  lng: number
  address: string
  region: string
  country: string
  countryCode: string
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'ReliefLens/1.0 (disaster-relief-app)' },
  })

  if (!response.ok) {
    return {
      lat,
      lng,
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      region: 'Unknown',
      country: 'Unknown',
      countryCode: 'XX',
    }
  }

  const data = await response.json()
  const addr = data.address || {}

  return {
    lat,
    lng,
    address: data.display_name || `${lat}, ${lng}`,
    region: addr.state || addr.region || addr.county || addr.city || 'Unknown',
    country: addr.country || 'Unknown',
    countryCode: (addr.country_code || 'xx').toUpperCase(),
  }
}
