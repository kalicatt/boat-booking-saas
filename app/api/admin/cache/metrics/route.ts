import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCacheMetrics, resetCacheMetrics } from '@/lib/cache'

/**
 * GET /api/admin/cache/metrics
 * Returns cache hit/miss statistics
 */
export async function GET() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const metrics = getCacheMetrics()
  
  return NextResponse.json({
    ...metrics,
    timestamp: new Date().toISOString(),
  })
}

/**
 * DELETE /api/admin/cache/metrics
 * Reset cache metrics counters
 */
export async function DELETE() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  resetCacheMetrics()
  
  return NextResponse.json({ 
    success: true, 
    message: 'Métriques réinitialisées',
    timestamp: new Date().toISOString()
  })
}
