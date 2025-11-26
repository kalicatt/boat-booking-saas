import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const email = session?.user?.email

    if (!email) return NextResponse.json({ error: "Non connecté" }, { status: 401 })

    const body = await request.json()
    const { image } = body

    // Mise à jour en base
    await prisma.user.update({
      where: { email },
      data: { image }
    })

    await createLog('PROFILE_UPDATE', `Mise à jour du profil (image) pour ${email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 })
  }
}