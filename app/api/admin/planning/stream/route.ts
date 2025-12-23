import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getRedisClient } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Clé Redis pour stocker le timestamp de la dernière mise à jour
const PLANNING_UPDATE_KEY = 'planning:last_update'

export async function GET(req: NextRequest) {
  // Vérifier l'authentification
  const session = await auth()
  if (!session?.user) {
    return new Response('Non authentifié', { status: 401 })
  }

  // Headers pour SSE
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Désactive le buffering nginx
  })

  const encoder = new TextEncoder()
  let lastKnownUpdate = Date.now().toString()
  let isActive = true

  const stream = new ReadableStream({
    async start(controller) {
      // Envoyer un ping initial
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`))

      const redis = getRedisClient()
      
      // Polling Redis pour détecter les changements
      const checkForUpdates = async () => {
        if (!isActive) return
        
        try {
          if (redis) {
            const latestUpdate = await redis.get<string>(PLANNING_UPDATE_KEY)
            if (latestUpdate && latestUpdate !== lastKnownUpdate) {
              lastKnownUpdate = latestUpdate
              controller.enqueue(
                encoder.encode(`event: update\ndata: ${JSON.stringify({ timestamp: latestUpdate })}\n\n`)
              )
            }
          }
        } catch (error) {
          console.error('SSE Redis check error:', error)
        }

        // Envoyer un heartbeat pour maintenir la connexion
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          isActive = false
        }

        // Vérifier toutes les 2 secondes
        if (isActive) {
          setTimeout(checkForUpdates, 2000)
        }
      }

      // Démarrer la vérification
      checkForUpdates()
    },
    cancel() {
      isActive = false
    }
  })

  return new Response(stream, { headers })
}

// Fonction utilitaire pour notifier une mise à jour (à appeler depuis les autres routes)
export async function notifyPlanningUpdate() {
  const redis = getRedisClient()
  if (redis) {
    await redis.set(PLANNING_UPDATE_KEY, Date.now().toString())
  }
}
