/**
 * API Route: GET /api/user/export
 * 
 * RGPD Article 20 - Droit à la portabilité des données
 * Permet à un utilisateur d'exporter toutes ses données personnelles
 * 
 * Formats supportés:
 * - JSON (par défaut)
 * - PDF (avec ?format=pdf)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ExportedData = {
  exportDate: string
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    createdAt: Date
  }
  bookings: Array<{
    id: string
    publicReference: string | null
    date: Date
    startTime: Date
    endTime: Date
    adults: number
    children: number
    babies: number
    language: string
    totalPrice: number
    status: string
    isPaid: boolean
    createdAt: Date
    boatName: string | null
  }>
  payments: Array<{
    id: string
    provider: string
    amount: number
    currency: string
    status: string
    createdAt: Date
    bookingReference: string | null
  }>
  contacts: Array<{
    id: string
    type: string
    firstName: string | null
    lastName: string | null
    message: string | null
    createdAt: Date
  }>
}

export async function GET(request: Request) {
  const session = await auth()
  
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Non authentifié. Veuillez vous connecter.' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  try {
    const userEmail = session.user.email

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer les réservations
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        boat: { select: { name: true } },
        payments: {
          select: {
            id: true,
            provider: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Récupérer les demandes de contact (si le modèle existe)
    let contacts: Array<{
      id: string
      type: string
      firstName: string | null
      lastName: string | null
      message: string | null
      createdAt: Date
    }> = []
    
    try {
      const contactRequests = await prisma.contactRequest.findMany({
        where: { email: userEmail },
        select: {
          id: true,
          kind: true,
          firstName: true,
          lastName: true,
          message: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      contacts = contactRequests.map(c => ({
        id: c.id,
        type: c.kind,
        firstName: c.firstName,
        lastName: c.lastName,
        message: c.message,
        createdAt: c.createdAt
      }))
    } catch {
      // ContactRequest model might not exist or have different structure
      contacts = []
    }

    // Construire l'export
    const exportData: ExportedData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        createdAt: user.createdAt
      },
      bookings: bookings.map(b => ({
        id: b.id,
        publicReference: b.publicReference,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        adults: b.adults,
        children: b.children,
        babies: b.babies,
        language: b.language,
        totalPrice: b.totalPrice,
        status: b.status,
        isPaid: b.isPaid,
        createdAt: b.createdAt,
        boatName: b.boat?.name || null
      })),
      payments: bookings.flatMap(b => 
        b.payments.map(p => ({
          id: p.id,
          provider: p.provider,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.createdAt,
          bookingReference: b.publicReference
        }))
      ),
      contacts
    }

    // Log l'export pour audit
    await log('info', 'RGPD data export requested', {
      route: '/api/user/export',
      userId: user.id,
      format
    })

    if (format === 'pdf') {
      // Pour le PDF, on retourne un JSON formaté pour le front
      // Le front peut ensuite générer le PDF côté client
      return NextResponse.json({
        ...exportData,
        _meta: {
          format: 'pdf-ready',
          title: 'Export de vos données personnelles - Sweet Narcisse',
          generatedAt: new Date().toISOString()
        }
      })
    }

    // Format JSON par défaut
    const filename = `sweet-narcisse-export-${user.id.slice(0, 8)}-${Date.now()}.json`
    
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Date': new Date().toISOString()
      }
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await log('error', 'RGPD export failed', {
      route: '/api/user/export',
      error: message
    })
    
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données' },
      { status: 500 }
    )
  }
}
