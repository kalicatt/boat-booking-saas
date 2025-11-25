import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns'

export const dynamic = 'force-dynamic'

// 1. RÉCUPÉRER LE RAPPORT MENSUEL
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  if (!monthParam) return NextResponse.json({ error: 'Mois manquant' }, { status: 400 })

  const dateRef = parseISO(`${monthParam}-01`)
  const start = startOfMonth(dateRef)
  const end = endOfMonth(dateRef)

  try {
    const shifts = await prisma.workShift.findMany({
      where: { startTime: { gte: start, lte: end } },
      include: { user: true },
      orderBy: { startTime: 'asc' }
    })

    const employees = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN'] } }
    })

    const report = employees.map(emp => {
      const empShifts = shifts.filter(s => s.userId === emp.id)
      
      // CALCUL PRÉCIS : (Fin - Début) - Pause
      const totalMinutes = empShifts.reduce((acc, s) => {
        const rawDuration = differenceInMinutes(new Date(s.endTime), new Date(s.startTime))
        const effectiveDuration = Math.max(0, rawDuration - s.breakMinutes) // On évite le négatif
        return acc + effectiveDuration
      }, 0)

      const totalHours = Math.round((totalMinutes / 60) * 100) / 100

      return {
        user: emp,
        totalHours: totalHours,
        shiftsCount: empShifts.length,
        details: empShifts
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// 2. AJOUTER UN SHIFT AVEC PAUSE
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, date, start, end, breakTime, note } = body

    const startTime = parseISO(`${date}T${start}:00`)
    const endTime = parseISO(`${date}T${end}:00`)
    const pause = parseInt(breakTime) || 0

    // Validation logique
    if (endTime <= startTime) {
        return NextResponse.json({ error: "La fin doit être après le début." }, { status: 400 })
    }
    
    const duration = differenceInMinutes(endTime, startTime)
    if (pause >= duration) {
        return NextResponse.json({ error: "La pause ne peut pas être plus longue que le temps de travail !" }, { status: 400 })
    }

    await prisma.workShift.create({
      data: {
        userId,
        startTime,
        endTime,
        breakMinutes: pause, // Enregistrement de la pause
        note
      }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: "Erreur création" }, { status: 500 })
  }
}