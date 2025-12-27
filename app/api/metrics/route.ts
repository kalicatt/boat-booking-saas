import { NextResponse } from 'next/server'
import { serializeMetrics } from '@/lib/metrics'
import { initBoatMetrics } from '@/lib/initMetrics'

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let metricsInitialized = false

/**
 * SECURITY: Check if request is from internal monitoring (VUL-004)
 * Requires either:
 * - Valid MONITORING_API_KEY header
 * - Request from localhost/internal network
 */
function isAuthorizedMonitoringRequest(request: Request): boolean {
  // Check API key
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.MONITORING_API_KEY && apiKey === process.env.MONITORING_API_KEY) {
    return true
  }
  
  // Check if request is from internal Prometheus scraper (localhost or docker network)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || ''
  
  // Allow internal IPs (docker network, localhost)
  const internalPatterns = ['127.0.0.1', '::1', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.']
  if (internalPatterns.some(pattern => ip.startsWith(pattern))) {
    return true
  }
  
  return false
}

export async function GET(request: Request) {
  // SECURITY: Require authentication for metrics endpoint (VUL-004)
  if (!isAuthorizedMonitoringRequest(request)) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'UNAUTHORIZED_METRICS' },
      { status: 403 }
    )
  }

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
