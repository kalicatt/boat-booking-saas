import { NextResponse } from 'next/server'
import { serializeMetrics } from '@/lib/metrics'

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const body = await serializeMetrics()
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}
