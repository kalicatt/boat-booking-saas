import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { auth } from '@/auth'
import { recordHttpRequest } from '@/lib/metrics'

const ADMIN_SESSION_COOKIE = 'sn_admin_session_start'
// Enforce a fixed 12h max session for /admin. The cookie itself must live longer than 12h,
// otherwise it can disappear client-side and get re-initialized (effectively bypassing expiry).
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12 // 12h fixed enforcement
const ADMIN_SESSION_MAX_AGE_MS = ADMIN_SESSION_MAX_AGE_SECONDS * 1000
const ADMIN_SESSION_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30 // keep start timestamp for 30 days

const DEFAULT_CONNECT_SOURCES = [
  "'self'",
  'https://www.google.com',
  'https://www.gstatic.com',
  'https://api.resend.com',
  'https://api.stripe.com',
  'https://www.paypal.com',
  'https://www.sandbox.paypal.com',
  'https://pay.google.com',
  'https://payments.google.com',
  'https://apple-pay-gateway.apple.com',
  'https://*.amazonaws.com'
]

const DEFAULT_FRAME_SOURCES = [
  "'self'",
  'https://www.google.com',
  'https://www.recaptcha.net',
  'https://js.stripe.com',
  'https://www.paypal.com',
  'https://www.sandbox.paypal.com',
  'https://pay.google.com'
]

function normalizeCspSource(value?: string) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed === "'self'" || trimmed.includes('*')) return trimmed
  try {
    return new URL(trimmed).origin
  } catch {
    if (/^[\w.-]+:\d+$/.test(trimmed)) {
      try {
        return new URL(`http://${trimmed}`).origin
      } catch {
        return null
      }
    }
    return null
  }
}

function buildConnectDirective() {
  const connectSources = [...DEFAULT_CONNECT_SOURCES]

  const appendSource = (candidate?: string) => {
    const normalized = normalizeCspSource(candidate)
    if (normalized && !connectSources.includes(normalized)) {
      connectSources.push(normalized)
    }
  }

  appendSource(process.env.STORAGE_ENDPOINT)

  const extraEntries = process.env.CSP_EXTRA_CONNECT
  if (extraEntries) {
    extraEntries
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => appendSource(entry))
  }

  return `connect-src ${connectSources.join(' ')}`
}

function buildFrameDirective() {
  const frameSources = [...DEFAULT_FRAME_SOURCES]

  const appendSource = (candidate?: string) => {
    const normalized = normalizeCspSource(candidate)
    if (normalized && !frameSources.includes(normalized)) {
      frameSources.push(normalized)
    }
  }

  appendSource(process.env.STORAGE_ENDPOINT)

  const extraEntries = process.env.CSP_EXTRA_FRAME
  if (extraEntries) {
    extraEntries
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => appendSource(entry))
  }

  return `frame-src ${frameSources.join(' ')}`
}

// Ajout des en-têtes de sécurité de base
function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=()')
  res.headers.set('X-XSS-Protection', '0')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  const baseDirectives: string[] = [
    "default-src 'self'",
    "img-src 'self' data: blob: https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypalobjects.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]

  baseDirectives.push(buildConnectDirective())
  baseDirectives.push(buildFrameDirective())

  if (isProd) {
    baseDirectives.push("script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com")
    baseDirectives.push("style-src 'self' 'unsafe-inline'")
    baseDirectives.push('upgrade-insecure-requests')
  } else {
    baseDirectives.push("script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com")
    baseDirectives.push("style-src 'self' 'unsafe-inline'")
  }

  baseDirectives.push("frame-ancestors 'self'")
  baseDirectives.push("script-src-attr 'none'")
  res.headers.set('Content-Security-Policy', baseDirectives.join('; '))
  return res
}

// --- CONFIG I18N ---
const locales = ['en', 'fr', 'de', 'es', 'it']
const defaultLocale = 'en'

function getLocale(request: NextRequest) {
  const headers = { 'accept-language': request.headers.get('accept-language') || '' }
  const languages = new Negotiator({ headers }).languages()
  return match(languages, locales, defaultLocale)
}

// --- LE PROXY COMBINÉ ---
export const proxy = auth((req) => {
  const startTime = performance.now()
  const method = req.method
  const pathname = req.nextUrl.pathname

  // Simplify route for metrics (remove IDs, language codes, etc.)
  const route = pathname
    .replace(/\/\d+/g, '/:id')
    .replace(/\/(fr|en|de|es|it)(\/|$)/, '/:lang$2')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')

  const { pathname: originalPath } = req.nextUrl
  const userAgent = req.headers.get('user-agent') || ''
  const isNativeApp = /(Capacitor|SweetNarcisseApp)/i.test(userAgent) || /;\s?wv\)/i.test(userAgent)

  type ProxyAuth = { auth?: { user?: { role?: string | null } } }
  const authUser = (req as unknown as ProxyAuth).auth?.user
  const authRole = authUser?.role ?? null

  if (originalPath.startsWith('/admin/employees')) {
    if (!authUser) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  if (
    originalPath.startsWith('/_next') ||
    originalPath.startsWith('/admin') ||
    originalPath.startsWith('/login') ||
    originalPath.startsWith('/cancel') ||
    originalPath.includes('.')
  ) {
    // Admin backoffice: require auth and enforce a fixed 12h session.
    if (originalPath === '/admin' || originalPath.startsWith('/admin/')) {
      if (!authUser) {
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        url.search = ''
        const response = applySecurityHeaders(NextResponse.redirect(url))
        trackRequestMetrics(method, route, response.status, startTime)
        return response
      }

      // Only backoffice roles should have access.
      if (!authRole || authRole === 'CLIENT') {
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        url.search = ''
        const response = applySecurityHeaders(NextResponse.redirect(url))
        trackRequestMetrics(method, route, response.status, startTime)
        return response
      }

      const now = Date.now()
      const cookieRaw = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
      const startedAt = cookieRaw ? Number(cookieRaw) : NaN
      const hasValidStart = Number.isFinite(startedAt) && startedAt > 0

      if (hasValidStart && now - startedAt > ADMIN_SESSION_MAX_AGE_MS) {
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        url.search = 'reason=expired'
        const response = applySecurityHeaders(NextResponse.redirect(url))
        response.cookies.delete({ name: ADMIN_SESSION_COOKIE, path: '/admin' })
        trackRequestMetrics(method, route, response.status, startTime)
        return response
      }

      const response = applySecurityHeaders(NextResponse.next())
      // If cookie is missing (existing sessions), initialize it once.
      if (!hasValidStart) {
        response.cookies.set(ADMIN_SESSION_COOKIE, String(now), {
          httpOnly: true,
          sameSite: 'lax',
          secure: req.nextUrl.protocol === 'https:',
          path: '/admin',
          maxAge: ADMIN_SESSION_COOKIE_TTL_SECONDS
        })
      }
      trackRequestMetrics(method, route, response.status, startTime)
      return response
    }

    const response = applySecurityHeaders(NextResponse.next())
    trackRequestMetrics(method, route, response.status, startTime)
    return response
  }

  if (originalPath.startsWith('/api')) {
    const response = applySecurityHeaders(NextResponse.next())
    trackRequestMetrics(method, route, response.status, startTime)
    return response
  }

  if (isNativeApp) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    const response = applySecurityHeaders(NextResponse.redirect(url))
    trackRequestMetrics(method, route, response.status, startTime)
    return response
  }

  const pathnameHasLocale = locales.some(
    (locale) => originalPath.startsWith(`/${locale}/`) || originalPath === `/${locale}`
  )

  if (pathnameHasLocale) {
    const response = applySecurityHeaders(NextResponse.next())
    trackRequestMetrics(method, route, response.status, startTime)
    return response
  }

  const locale = getLocale(req)
  req.nextUrl.pathname = `/${locale}${originalPath}`

  const response = applySecurityHeaders(NextResponse.redirect(req.nextUrl))
  trackRequestMetrics(method, route, response.status, startTime)
  return response
})

function trackRequestMetrics(method: string, route: string, status: number, startTime: number) {
  // Skip metrics endpoint to avoid recursion
  if (route.startsWith('/api/metrics')) return
  
  Promise.resolve().then(() => {
    const duration = performance.now() - startTime
    recordHttpRequest(method, route, status, duration)
  }).catch((err) => {
    // Silently ignore metrics errors to not break requests
    console.debug('Metrics tracking failed:', err)
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
