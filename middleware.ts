// middleware.ts (À la racine du projet)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { auth } from "@/auth"; // Import de NextAuth

// Ajout des en-têtes de sécurité de base
function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=()')
  res.headers.set('X-XSS-Protection', '0') // Obsolète (mise à 0 pour éviter faux sens)

  const isProd = process.env.NODE_ENV === 'production'

  // Directives de base communes
  const baseDirectives: string[] = [
    "default-src 'self'",
    "img-src 'self' data: blob: https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypalobjects.com",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google.com https://www.gstatic.com https://api.resend.com https://api.stripe.com https://www.paypal.com https://pay.google.com https://payments.google.com https://apple-pay-gateway.apple.com",
    "frame-src 'self' https://www.google.com https://www.recaptcha.net https://js.stripe.com https://www.paypal.com https://pay.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]

  // Scripts / Styles selon l'environnement
  if (isProd) {
    // Mode production (plus strict) – pas d'eval, on garde inline si Next injecte des scripts data
    baseDirectives.push("script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypal.com")
    baseDirectives.push("style-src 'self' 'unsafe-inline'")
  } else {
    // Dev: autoriser eval pour outils React / sourcemaps
    baseDirectives.push("script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://js.stripe.com https://www.paypal.com")
    baseDirectives.push("style-src 'self' 'unsafe-inline'")
  }

  res.headers.set('Content-Security-Policy', baseDirectives.join('; '))
  return res
}

// --- CONFIG I18N ---
const locales = ["en", "fr", "de", "es", "it"];
const defaultLocale = "en"; // Anglais par défaut

function getLocale(request: NextRequest) {
  const headers = { "accept-language": request.headers.get("accept-language") || "" };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales, defaultLocale);
}

// --- LE MIDDLEWARE COMBINÉ ---
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 0. BASIC AUTH GUARD: require login for /admin/employees (role checked server-side for logging)
  if (pathname.startsWith('/admin/employees')) {
    const user: any = (req as any).auth?.user
    if (!user) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  // 1. GESTION DES ROUTES SPÉCIALES (Ignorées par I18N)
  // On ne redirige pas les fichiers systèmes, les APIs, ou les routes admin/login
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin") || 
    pathname.startsWith("/login") || 
    pathname.includes(".")
  ) {
    // Pour ces routes on laisse passer mais on ajoute les headers
    return applySecurityHeaders(NextResponse.next())
  }

  // Cas API : on applique seulement les headers (pas de logique i18n)
  if (pathname.startsWith('/api')) {
    return applySecurityHeaders(NextResponse.next())
  }

  // 2. GESTION I18N (Langues) 🌍
  
  // Si l'URL contient déjà une locale (ex: /fr/...)
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return applySecurityHeaders(NextResponse.next());

  // 3. Redirection vers la langue détectée (ex: / -> /fr)
  const locale = getLocale(req);
  req.nextUrl.pathname = `/${locale}${pathname}`;
  
  return applySecurityHeaders(NextResponse.redirect(req.nextUrl));
});

// Configuration du matcher
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};