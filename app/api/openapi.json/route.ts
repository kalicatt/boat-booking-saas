import { NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi'

export const dynamic = 'force-static'
export const revalidate = 3600 // Cache 1 hour

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
