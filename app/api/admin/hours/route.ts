import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns'
import { auth } from '@/auth'

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
    // Role-based scoping: employees only see their own shifts
    const session = await auth()
    const userInfo = session?.user as { role?: string; email?: string } | undefined
    const role = userInfo?.role || 'GUEST'
    const email = userInfo?.email

    let employees
    if (role === 'EMPLOYEE' && email) {
      const me = await prisma.user.findUnique({ where: { email } })
      if (!me) return NextResponse.json([])
      employees = [me]
    } else {
      employees = await prisma.user.findMany({ where: { role: { in: ['EMPLOYEE', 'ADMIN'] } } })
    }

    const shifts = await prisma.workShift.findMany({
      where: {
        startTime: { gte: start, lte: end },
        ...(role === 'EMPLOYEE' && email ? { user: { email } } : {})
      },
      include: { user: true },
      orderBy: { startTime: 'asc' }
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
    // Authorize: only ADMIN or SUPER_ADMIN can modify hours
    const session = await auth()
      const role = (session?.user as { role?: string })?.role || 'GUEST'
      if (!['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé: réservé aux administrateurs.' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, date, start, end, breakTime, note } = body

    // Construct UTC "wall-clock" timestamps to avoid timezone drift
    const startTime = new Date(`${date}T${start}:00.000Z`)
    const endTime = new Date(`${date}T${end}:00.000Z`)
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

// 3. METTRE À JOUR UN SHIFT EXISTANT (ADMIN uniquement)
export async function PUT(request: Request) {
  try {
    const session = await auth()
    const role = (session?.user as { role?: string })?.role || 'GUEST'
      if (!['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé: réservé aux administrateurs.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, date, start, end, breakTime, note } = body
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const startTime = new Date(`${date}T${start}:00.000Z`)
    const endTime = new Date(`${date}T${end}:00.000Z`)
    const pause = parseInt(breakTime) || 0

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'La fin doit être après le début.' }, { status: 400 })
    }

    const duration = differenceInMinutes(endTime, startTime)
    if (pause >= duration) {
      return NextResponse.json({ error: 'La pause ne peut pas être plus longue que le temps de travail !' }, { status: 400 })
    }

    await prisma.workShift.update({
      where: { id },
      data: { startTime, endTime, breakMinutes: pause, note }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

// 4. SUPPRIMER UN SHIFT (ADMIN uniquement)
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    const role = (session?.user as { role?: string })?.role || 'GUEST'
    if (!['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé: réservé aux administrateurs.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')
    if (!id) {
      try {
        const body = await request.json()
        id = body?.id || null
      } catch {}
    }
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    await prisma.workShift.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}