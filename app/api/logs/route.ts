import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.log.findMany({
      orderBy: { createdAt: 'desc' }, // Les plus récents en premier
      take: 100, // On limite aux 100 derniers pour ne pas surcharger
      include: {
        user: {
          select: { firstName: true, lastName: true, role: true }
        }
      }
    })
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: "Erreur logs" }, { status: 500 })
  }
}