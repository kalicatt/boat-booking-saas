import { NextRequest, NextResponse } from 'next/server'
import { recordHttpRequest } from '@/lib/metrics'

export function middleware(request: NextRequest) {
  const startTime = performance.now()
  const method = request.method
  const pathname = request.nextUrl.pathname

  // Simplify route for metrics (remove IDs, language codes, etc.)
  const route = pathname
    .replace(/\/\d+/g, '/:id')
    .replace(/\/(fr|en|de|es|it)(\/|$)/, '/:lang$2')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')

  // Continue processing
  const response = NextResponse.next()

  // Record metrics after response (best effort)
  response.headers.set('X-SN-Route', route)
  
  // Track timing in background (won't block response)
  Promise.resolve().then(() => {
    const duration = performance.now() - startTime
    const status = response.status || 200
    recordHttpRequest(method, route, status, duration)
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'
  ]
}
