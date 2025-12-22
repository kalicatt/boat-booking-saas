import { prisma } from '@/lib/prisma'
import { setBoatCapacity } from '@/lib/metrics'
import { logger } from '@/lib/logger'

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
    
    logger.info({ boatCount: boats.length }, 'Initialized boat capacity metrics')
  } catch (error) {
    logger.error({ error }, 'Failed to initialize boat capacities')
  }
}
