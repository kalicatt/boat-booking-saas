import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'
import { verifyBookingToken } from '@/lib/bookingToken'
import { createLog } from '@/lib/logger'

type VerifyPayload = {
  bookingId: string
  token: string
  autoCheckin?: boolean // true par défaut
}

export async function POST(request: NextRequest) {
  // Vérifier authentification mobile
  const user = await getMobileUser(request)
  if (!isStaff(user)) {
    return forbiddenResponse()
  }

  let body: VerifyPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ 
      valid: false, 
      error: 'Format de requête invalide' 
    }, { status: 400 })
  }

  const { bookingId, token, autoCheckin = true } = body

  if (!bookingId || !token) {
    return NextResponse.json({ 
      valid: false, 
      error: 'bookingId et token sont requis' 
    }, { status: 400 })
  }

  // 1. Vérifier le token du QR code
  const isTokenValid = verifyBookingToken(bookingId, token)
  if (!isTokenValid) {
    await createLog('MOBILE_QR_SCAN_INVALID', `QR invalide pour booking ${bookingId}`)
    return NextResponse.json({ 
      valid: false, 
      error: 'QR code invalide ou expiré' 
    }, { status: 403 })
  }

  // 2. Récupérer la réservation complète
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        }
      },
      boat: {
        select: {
          name: true,
          capacity: true,
        }
      }
    }
  })

  if (!booking) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Réservation introuvable' 
    }, { status: 404 })
  }

  // 3. Vérifier les conditions d'embarquement
  if (booking.status === 'CANCELLED') {
    return NextResponse.json({ 
      valid: false, 
      error: 'Réservation annulée',
      booking: {
        publicReference: booking.publicReference,
        status: 'CANCELLED'
      }
    }, { status: 409 })
  }

  // 4. Vérifier si déjà embarqué
  const alreadyCheckedIn = booking.checkinStatus === 'EMBARQUED'

  // 5. Auto check-in si demandé et pas encore fait
  let updatedBooking = booking
  if (autoCheckin && !alreadyCheckedIn) {
    updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { checkinStatus: 'EMBARQUED' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        boat: {
          select: {
            name: true,
            capacity: true,
          }
        }
      }
    })

    // Log l'embarquement
    await createLog(
      'MOBILE_QR_CHECKIN',
      `Check-in automatique via QR pour ${booking.publicReference} - ${booking.user?.firstName} ${booking.user?.lastName} par ${session.user.id}`
    )
  } else if (alreadyCheckedIn) {
    await createLog(
      'MOBILE_QR_SCAN_ALREADY_CHECKIN',
      `QR scanné pour ${booking.publicReference} - Déjà embarqué par ${session.user.id}`
    )
  }

  // 6. Formater la réponse pour l'app mobile
  const customerName = `${updatedBooking.user?.firstName || ''} ${updatedBooking.user?.lastName || ''}`.trim() || 'Client'

  return NextResponse.json({
    valid: true,
    autoCheckedIn: autoCheckin && !alreadyCheckedIn,
    alreadyCheckedIn,
    booking: {
      id: updatedBooking.id,
      publicReference: updatedBooking.publicReference,
      customerName,
      customerEmail: updatedBooking.user?.email || null,
      customerPhone: updatedBooking.user?.phone || null,
      startTime: updatedBooking.startTime.toISOString(),
      endTime: updatedBooking.endTime.toISOString(),
      date: updatedBooking.date.toISOString(),
      boatName: updatedBooking.boat?.name || 'Non assigné',
      boatCapacity: updatedBooking.boat?.capacity || null,
      language: updatedBooking.language || 'fr',
      isPaid: updatedBooking.isPaid,
      totalPrice: updatedBooking.totalPrice,
      participants: {
        adults: updatedBooking.adults,
        children: updatedBooking.children,
        babies: updatedBooking.babies,
        total: updatedBooking.adults + updatedBooking.children + updatedBooking.babies
      },
      checkinStatus: updatedBooking.checkinStatus,
      status: updatedBooking.status,
      createdAt: updatedBooking.createdAt.toISOString(),
    }
  })
}
