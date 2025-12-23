import { getRedisClient } from '@/lib/redis'

const PLANNING_UPDATE_KEY = 'planning:last_update'

/**
 * Notifie une mise à jour du planning en temps réel
 * Appeler cette fonction après toute modification de réservation
 */
export async function notifyPlanningUpdate(): Promise<void> {
  try {
    const redis = getRedisClient()
    if (redis) {
      await redis.set(PLANNING_UPDATE_KEY, Date.now().toString())
    }
  } catch (error) {
    console.error('Failed to notify planning update:', error)
  }
}
