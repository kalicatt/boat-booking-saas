import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { createLog } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    // 1. Qui est connecté ?
    const session = await auth()
    const email = session?.user?.email

    if (!email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères" }, { status: 400 })
    }

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

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}