import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'
import crypto from 'crypto'

export const runtime = 'nodejs'

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'

/**
 * API mobile: Authentification employé
 * 
 * POST /api/mobile/auth/login
 * Body: { email: string, password: string }
 * 
 * Returns: { success: true, user: {...}, token: string } ou { error: string }
 */

function createToken(payload: object): string {
  // Créer un token simple signé avec HMAC-SHA256
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payloadWithExp = { ...payload, exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) } // 30 jours
  const body = Buffer.from(JSON.stringify(payloadWithExp)).toString('base64url')
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    if (!user.password) {
      return NextResponse.json({ error: 'Compte non configuré pour la connexion par mot de passe' }, { status: 401 })
    }

    // Vérifier si le compte est actif
    if (user.isActive === false) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
    }

    // Vérifier le rôle (seuls les admins/employés peuvent se connecter)
    const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']
    if (!allowedRoles.includes(user.role || '')) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Vérifier le mot de passe
    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    // Créer un token JWT pour l'app mobile
    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    })

    // Retourner les infos utilisateur et le token
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image
      },
      token
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/auth/login] failed', message)
    return NextResponse.json({ error: 'Erreur lors de la connexion' }, { status: 500 })
  }
}
