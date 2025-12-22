import { NextResponse } from 'next/server'
import { serializeMetrics } from '@/lib/metrics'
import { initBoatMetrics } from '@/lib/initMetrics'

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let metricsInitialized = false

export async function GET() {
  // Initialize boat metrics once on first request
  if (!metricsInitialized) {
    await initBoatMetrics()
    metricsInitialized = true
  }

  const body = await serializeMetrics()
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}
