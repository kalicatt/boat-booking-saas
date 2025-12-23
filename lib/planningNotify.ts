import { getRedisClient } from '@/lib/redis'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

const PLANNING_UPDATE_KEY = 'planning:last_update'
const LOCAL_UPDATE_FILE = join(process.cwd(), '.planning-update')

// Cache en mémoire pour le timestamp de dernière mise à jour
let memoryTimestamp: string | null = null

/**
 * Notifie une mise à jour du planning en temps réel
 * Appeler cette fonction après toute modification de réservation
 * Utilise Redis si disponible, sinon un fichier local comme fallback
 */
export async function notifyPlanningUpdate(): Promise<void> {
  const timestamp = Date.now().toString()
  memoryTimestamp = timestamp
  
  try {
    const redis = getRedisClient()
    if (redis) {
      await redis.set(PLANNING_UPDATE_KEY, timestamp)
      console.log('[planningNotify] Updated via Redis:', timestamp)
      return
    }
  } catch (error) {
    console.warn('[planningNotify] Redis failed, using file fallback:', error)
  }
  
  // Fallback: écrire dans un fichier local
  try {
    await writeFile(LOCAL_UPDATE_FILE, timestamp, 'utf-8')
    console.log('[planningNotify] Updated via file:', timestamp)
  } catch (error) {
    console.error('[planningNotify] Failed to write file:', error)
  }
}

/**
 * Récupère le timestamp de la dernière mise à jour du planning
 */
export async function getLastPlanningUpdate(): Promise<string | null> {
  try {
    const redis = getRedisClient()
    if (redis) {
      return await redis.get<string>(PLANNING_UPDATE_KEY)
    }
  } catch {
    // Fallback sur fichier
  }
  
  try {
    return await readFile(LOCAL_UPDATE_FILE, 'utf-8')
  } catch {
    return memoryTimestamp
  }
}
