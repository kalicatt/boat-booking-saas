import { prisma } from '@/lib/prisma'
import { setBoatCapacity } from '@/lib/metrics'

/**
 * Initialize boat capacity metrics from database
 * Called once at application startup
 */
export async function initBoatMetrics() {
  try {
    const boats = await prisma.boat.findMany({
      select: { name: true, capacity: true }
    })
    
    for (const boat of boats) {
      setBoatCapacity(boat.name, boat.capacity)
    }
    
    console.log(`[Metrics] Initialized ${boats.length} boat capacity metrics`)
  } catch (error) {
    console.error('[Metrics] Failed to initialize boat capacities:', error)
  }
}
