import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const email = session?.user?.email

    if (!email) return NextResponse.json({ error: "Non connecté" }, { status: 401 })

    const ip = getClientIp(request.headers)
    const rl = await rateLimit({ key: `auth:profile:${ip}`, limit: 30, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })

    const json = await request.json()
    const schema = z.object({
      image: z.string().url().max(500).or(z.string().length(0))
    })
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    const { image } = parsed.data

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