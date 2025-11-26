import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth' 

// GET (READ details of a single booking)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    // Protection: Seuls les administrateurs peuvent voir les détails complets des réservations
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: "Accès non autorisé. Réservé aux administrateurs." }, { status: 403 })
    }

    const { id } = params
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      // 🔑 MODIFICATION CLÉ : Inclure les détails de l'utilisateur (le client) et de la barque
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        boat: {
            select: {
                id: true,
                name: true,
            }
        }
      }
    })
    
    if (!booking) {
      return NextResponse.json({ error: "Réservation non trouvée" }, { status: 404 })
    }
    
    return NextResponse.json(booking)
  } catch (error) {
    console.error("ERREUR GET BOOKING DETAIL:", error)
    return NextResponse.json({ error: "Erreur technique lors de la récupération des détails." }, { status: 500 })
  }
}

// PUT (UPDATE a booking - e.g., status, boat, details)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
        }
        
        const { id } = params
        const body = await request.json()
        const { status, boatId, ...dataToUpdate } = body

        // Logique de mise à jour: On suppose que seul le statut et le bateau sont les plus souvent mis à jour
        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: {
                status: status,
                boat: boatId ? { connect: { id: boatId } } : undefined,
                // Si d'autres champs doivent être mis à jour, ils devraient être gérés ici
            },
            include: { user: true, boat: true } // Retourne l'objet complet mis à jour
        })

        await createLog("BOOKING_UPDATE", `Réservation #${id} mise à jour (Statut: ${status}).`)
        return NextResponse.json(updatedBooking)

    } catch (error) {
        console.error("ERREUR PUT BOOKING:", error)
        return NextResponse.json({ error: "Erreur lors de la mise à jour de la réservation." }, { status: 500 })
    }
}

// DELETE (CANCEL/DELETE a booking)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
        }

        const { id } = params
        
        // Plutôt que de supprimer, on préfère souvent annuler pour garder l'historique
        const cancelledBooking = await prisma.booking.update({
            where: { id },
            data: { status: 'CANCELLED' }
        })

        await createLog("BOOKING_CANCEL", `Réservation #${id} annulée.`)
        return NextResponse.json(cancelledBooking)

    } catch (error) {
        console.error("ERREUR DELETE BOOKING:", error)
        return NextResponse.json({ error: "Erreur lors de l'annulation de la réservation." }, { status: 500 })
    }
}