import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, format } from 'date-fns'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'

const TOUR_DURATION = 25
const BUFFER_TIME = 5

// 1. FIX: Interface pour dire à TypeScript que firstName existe
interface ExtendedUser {
  firstName?: string | null
  lastName?: string | null
}

// --- DELETE : Supprimer une réservation ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Next.js 15
) {
  const { id } = await params 

  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  // 2. FIX: Casting de l'utilisateur
  const user = session.user as ExtendedUser

  try {
    await prisma.booking.delete({ where: { id } })

    // Utilisation sécurisée du prénom avec fallback
    const userName = user.firstName || 'Admin'
    await createLog('DELETE_BOOKING', `Réservation ${id} supprimée par ${userName}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE réservation:', error)
    return NextResponse.json({ error: "Erreur serveur lors de la suppression." }, { status: 500 })
  }
}

// --- PATCH : Mettre à jour une réservation ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  // 2. FIX: Casting de l'utilisateur
  const user = session.user as ExtendedUser

  try {
    const body = await request.json()
    const { start, newCheckinStatus, newIsPaid } = body

    const dataToUpdate: any = {}
    const userName = user.firstName || 'Admin'
    let logMessage = `Admin ${userName} met à jour réservation ${id}: `

    if (start) {
      const startTime = new Date(start)
      const endTime = addMinutes(startTime, TOUR_DURATION)
      // On ne stocke pas endWithBuffer en DB, juste pour info ou calcul si besoin
      
      dataToUpdate.startTime = startTime
      dataToUpdate.endTime = endTime
      logMessage += `Nouvelle heure → ${format(startTime, 'HH:mm')}. `
    }

    if (newCheckinStatus !== undefined) {
      dataToUpdate.checkinStatus = newCheckinStatus
      logMessage += `Check-in = ${newCheckinStatus}. `
    }

    if (newIsPaid !== undefined) {
      dataToUpdate.isPaid = newIsPaid
      logMessage += `Paiement = ${newIsPaid}. `
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour." }, { status: 400 })
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: dataToUpdate
    })

    await createLog('UPDATE_BOOKING_ADMIN', logMessage)

    return NextResponse.json({ success: true, booking: updatedBooking })
  } catch (error) {
    console.error('Erreur PATCH réservation:', error)
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 })
  }
}