import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'

export const runtime = 'nodejs'

const JWT_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'

/**
 * API mobile: Authentification employé
 * 
 * POST /api/mobile/auth/login
 * Body: { email: string, password: string }
 * 
 * Returns: { success: true, user: {...}, token: string } ou { error: string }
 */
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
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

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
