import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns'
import { createLog } from '@/lib/logger' // On ajoute le log pour la sécurité

export const dynamic = 'force-dynamic'

// 1. GET : RÉCUPÉRER LE RAPPORT DU MOIS
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month') // Ex: "2025-11"

  if (!monthParam) return NextResponse.json({ error: 'Mois manquant' }, { status: 400 })

  // Calcul des dates de début et fin du mois
  const dateRef = parseISO(`${monthParam}-01`)
  const start = startOfMonth(dateRef)
  const end = endOfMonth(dateRef)

  try {
    // On récupère les shifts
    const shifts = await prisma.workShift.findMany({
      where: { startTime: { gte: start, lte: end } },
      include: { user: true },
      orderBy: { startTime: 'asc' }
    })

    // On récupère tous les employés pour les afficher même s'ils n'ont pas travaillé
    const employees = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN', 'SUPERADMIN'] } }
    })

    // On construit le rapport
    const report = employees.map(emp => {
      const empShifts = shifts.filter(s => s.userId === emp.id)
      
      // Calcul du temps total (Minutes travaillées - Minutes de pause)
      const totalMinutes = empShifts.reduce((acc, s) => {
        const rawDuration = differenceInMinutes(new Date(s.endTime), new Date(s.startTime))
        const effectiveDuration = Math.max(0, rawDuration - s.breakMinutes) 
        return acc + effectiveDuration
      }, 0)

      // Conversion en heures décimales (ex: 1h30 -> 1.5)
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
    console.error(error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// 2. POST : AJOUTER UNE JOURNÉE DE TRAVAIL
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, date, start, end, breakTime, note } = body

    // On reconstruit les dates complètes
    const startTime = parseISO(`${date}T${start}:00`)
    const endTime = parseISO(`${date}T${end}:00`)
    
    // breakTime arrive en minutes (entier) depuis le frontend
    const pause = parseInt(breakTime) || 0

    if (endTime <= startTime) {
        return NextResponse.json({ error: "L'heure de fin doit être après le début." }, { status: 400 })
    }

    // Enregistrement
    await prisma.workShift.create({
      data: {
        userId,
        startTime,
        endTime,
        breakMinutes: pause,
        note
      }
    })

    // Petit mouchard de sécurité
    await createLog("ADD_SHIFT", `Ajout heures pour l'employé ${userId} (${date})`)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
  }
}