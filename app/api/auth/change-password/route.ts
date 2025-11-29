import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { createLog } from '@/lib/logger'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { evaluatePassword } from '@/lib/passwordPolicy'

export async function POST(request: Request) {
  try {
    // 1. Qui est connecté ?
    const session = await auth()
    const email = session?.user?.email

    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const ip = getClientIp(request.headers)
    const rl = await rateLimit({ key: `auth:pwchange:${ip}`, limit: 10, windowMs: 300_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de tentatives', retryAfter: rl.retryAfter }, { status: 429 })

    const json = await request.json()
    const schema = z.object({
      currentPassword: z.string().min(6).max(100),
      newPassword: z.string().min(8).max(100)
        .refine(p => /[A-Z]/.test(p), { message: '1 majuscule requise' })
        .refine(p => /[a-z]/.test(p), { message: '1 minuscule requise' })
        .refine(p => /\d/.test(p), { message: '1 chiffre requis' })
    })
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    const { currentPassword, newPassword } = parsed.data

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    const policy = evaluatePassword(newPassword, [email, session?.user?.firstName ?? '', session?.user?.lastName ?? ''])
    if (!policy.valid) {
      return NextResponse.json({ error: policy.feedback || 'Mot de passe trop faible', score: policy.score }, { status: 422 })
    }

    // Force: already validated length & complexity via zod

    // 2. Récupérer l'utilisateur en base
    const user = await prisma.user.findUnique({ where: { email } })
    
    if (!user || !user.password) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    // 3. Vérifier l'ANCIEN mot de passe
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    
    if (!isMatch) {
        return NextResponse.json({ error: "L'ancien mot de passe est incorrect." }, { status: 403 })
    }

    // 4. Hacher et enregistrer le NOUVEAU
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    })

    // Log action
    await createLog('PASSWORD_CHANGE', `Mot de passe changé pour ${email}`)

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('POST /api/auth/change-password failed:', msg)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}