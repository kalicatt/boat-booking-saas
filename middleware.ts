// middleware.ts (À la racine du projet)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { auth } from "@/auth"; // Import de NextAuth

// --- CONFIG I18N ---
const locales = ["en", "fr", "de"];
const defaultLocale = "en"; // Anglais par défaut

function getLocale(request: NextRequest) {
  const headers = { "accept-language": request.headers.get("accept-language") || "" };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales, defaultLocale);
}

// --- LE MIDDLEWARE COMBINÉ ---
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 1. GESTION DES ROUTES SPÉCIALES (Ignorées par I18N)
  // On ne redirige pas les fichiers systèmes, les APIs, ou les routes admin/login
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") || 
    pathname.startsWith("/login") || 
    pathname.includes(".")
  ) {
    return;
  }

  // 2. GESTION I18N (Langues) 🌍
  
  // Si l'URL contient déjà une locale (ex: /fr/...)
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // 3. Redirection vers la langue détectée (ex: / -> /fr)
  const locale = getLocale(req);
  req.nextUrl.pathname = `/${locale}${pathname}`;
  
  return NextResponse.redirect(req.nextUrl);
});

// Configuration du matcher
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};