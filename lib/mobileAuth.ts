import { NextResponse } from 'next/server'
import crypto from 'crypto'

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
const STAFF_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

export interface MobileUser {
  userId: string
  email: string
  role: string
  firstName?: string
  lastName?: string
}

/**
 * Vérifie le token JWT mobile et retourne l'utilisateur
 */
export function verifyMobileToken(token: string): MobileUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, payload, signature] = parts
    
    // Vérifier la signature
    const expectedSignature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url')
    
    if (signature !== expectedSignature) {
      console.log('[mobile-auth] Invalid signature')
      return null
    }

    // Décoder le payload
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    
    // Vérifier l'expiration
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[mobile-auth] Token expired')
      return null
    }

    return {
      userId: decodedPayload.userId,
      email: decodedPayload.email,
      role: decodedPayload.role,
      firstName: decodedPayload.firstName,
      lastName: decodedPayload.lastName
    }
  } catch (error) {
    console.error('[mobile-auth] Token verification failed:', error)
    return null
  }
}

/**
 * Middleware pour vérifier l'authentification mobile
 * Accepte soit un token Bearer, soit une session NextAuth
 */
export async function getMobileUser(request: Request): Promise<MobileUser | null> {
  // Essayer d'abord le token Bearer
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const user = verifyMobileToken(token)
    if (user) return user
  }

  // Sinon, essayer la session NextAuth (pour les requêtes web)
  try {
    const { auth } = await import('@/auth')
    const session = await auth()
    if (session?.user) {
      const user = session.user as { id?: string; email?: string; role?: string; firstName?: string; lastName?: string }
      return {
        userId: user.id || '',
        email: user.email || '',
        role: user.role || 'GUEST',
        firstName: user.firstName,
        lastName: user.lastName
      }
    }
  } catch {
    // Ignorer les erreurs NextAuth
  }

  return null
}

/**
 * Helper pour vérifier si l'utilisateur est staff
 */
export function isStaff(user: MobileUser | null): boolean {
  return user !== null && STAFF_ROLES.includes(user.role)
}

/**
 * Réponse d'erreur standard pour les API mobiles
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
