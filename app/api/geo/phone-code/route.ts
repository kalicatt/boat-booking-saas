import { NextResponse } from 'next/server'
import { PHONE_CODES } from '@/lib/phoneData'

// Simple country code detection using external IP geolocation service.
// For production you may want to switch to a paid provider or self-hosted DB (MaxMind / DB-IP).
// This endpoint returns { countryCode: 'FR', dialCode: '+33' }
export async function GET(request: Request) {
  try {
    const ipHeader = request.headers.get('x-forwarded-for') || ''
    const ip = ipHeader.split(',')[0].trim() || ''

    // Avoid calling external API for private/local IPs.
    if (!ip || /^10\.|^192\.168\.|^127\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
      return NextResponse.json({ countryCode: 'FR', dialCode: '+33', source: 'default' })
    }

    // Using ipapi.co (no key required, rate limited). Alternative: ipinfo.io/json
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { cache: 'no-store' })
    if (!geoRes.ok) {
      return NextResponse.json({ countryCode: 'FR', dialCode: '+33', source: 'fallback' })
    }
    const data = await geoRes.json()
    const countryCode: string | undefined = data.country_code
    if (!countryCode) {
      return NextResponse.json({ countryCode: 'FR', dialCode: '+33', source: 'no-country' })
    }
    const match = PHONE_CODES.find(pc => pc.iso2 === countryCode)
    return NextResponse.json({ countryCode, dialCode: match?.code || '+33', source: 'geo' })
  } catch (e) {
    return NextResponse.json({ countryCode: 'FR', dialCode: '+33', source: 'error' }, { status: 200 })
  }
}
