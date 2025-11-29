// proxy.ts (à la racine du projet)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { auth } from '@/auth'

// Ajout des en-têtes de sécurité de base
function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY')
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
    "connect-src 'self' https://www.google.com https://www.gstatic.com https://api.resend.com https://api.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://pay.google.com https://payments.google.com https://apple-pay-gateway.apple.com",
    "frame-src 'self' https://www.google.com https://www.recaptcha.net https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://pay.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]

  if (isProd) {
    baseDirectives.push("script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com")
    baseDirectives.push("style-src 'self' 'unsafe-inline'")
    baseDirectives.push('upgrade-insecure-requests')
  } else {
    baseDirectives.push("script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com")
    baseDirectives.push("style-src 'self' 'unsafe-inline'")
  }

  baseDirectives.push("frame-ancestors 'none'")
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
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin/employees')) {
    const user: any = (req as any).auth?.user
    if (!user) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.includes('.')
  ) {
    return applySecurityHeaders(NextResponse.next())
  }

  if (pathname.startsWith('/api')) {
    return applySecurityHeaders(NextResponse.next())
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return applySecurityHeaders(NextResponse.next())

  const locale = getLocale(req)
  req.nextUrl.pathname = `/${locale}${pathname}`

  return applySecurityHeaders(NextResponse.redirect(req.nextUrl))
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
