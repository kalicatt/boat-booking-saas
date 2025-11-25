import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ROUTES QUI NÉCESSITENT L'AUTH
const protectedRoutes = [
  "/dashboard",
  "/admin",
  "/calendar",
  "/manage-bookings",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🚫 Ignore TOUTES les routes API + fichiers internes Next.js
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Récupération du token (ou session)
  const token = req.cookies.get("session")?.value;

  // 🔐 Si route protégée → vérifier session
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

/**
 * ⛔ NEXT 14 — NO CONFIG !
 * On utilise directement matcher dans export const middleware
 */
export const matcher = [
  /*
   * ⚠ NE PAS inclure /api ici !
   * On applique le middleware à TOUT sauf API & fichiers système
   */
  "/((?!api|_next/static|_next/image|favicon.ico).*)",
];
