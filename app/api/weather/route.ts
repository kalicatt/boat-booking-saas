import { NextResponse } from 'next/server'
import { getPublicWeatherSnapshot } from '@/lib/weather'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const payload = await getPublicWeatherSnapshot()
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Public weather fetch failed:', message)
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 503 })
  }
}
