import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getLastPlanningUpdate, notifyPlanningUpdate } from '@/lib/planningNotify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

      // Polling pour détecter les changements
      const checkForUpdates = async () => {
        if (!isActive) return
        
        try {
          const latestUpdate = await getLastPlanningUpdate()
          if (latestUpdate && latestUpdate !== lastKnownUpdate) {
            lastKnownUpdate = latestUpdate
            controller.enqueue(
              encoder.encode(`event: update\ndata: ${JSON.stringify({ timestamp: latestUpdate })}\n\n`)
            )
          }
        } catch (error) {
          console.error('SSE check error:', error)
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

// Re-export pour compatibilité avec les imports existants
export { notifyPlanningUpdate }
