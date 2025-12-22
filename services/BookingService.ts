/**
 * BookingService - Gestion des réservations
 * 
 * Responsabilités:
 * - Validation des créneaux horaires
 * - Vérification des conflits
 * - Création de réservations
 * - Gestion des groupes chainés
 * - Privatisation
 */

import { prisma } from '@/lib/prisma'
import { addMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { nanoid } from 'nanoid'
import { createLog } from '@/lib/logger'
import { cacheInvalidateDate } from '@/lib/cache'
import { parseParisWallDate, getParisTodayISO, getParisNowParts } from '@/lib/time'
import { MIN_BOOKING_DELAY_MINUTES } from '@/lib/config'
import { generateSeasonalBookingReference } from '@/lib/bookingReference'
import { FleetService } from './FleetService'
import type { Booking, Boat, Prisma } from '@prisma/client'

// --- Configuration ---
const TOUR_DURATION = 25 // minutes
const BUFFER_TIME = 5 // minutes entre deux tours
const PRICE_ADULT = 9
const PRICE_CHILD = 4
const PRICE_BABY = 0

// Plages horaires autorisées
const MORNING_START = 600 // 10:00
const MORNING_END = 705   // 11:45
const AFTERNOON_START = 810 // 13:30
const AFTERNOON_END = 1065  // 17:45

// Types d'entrée
export type CreateBookingInput = {
  date: string // YYYY-MM-DD
  time: string // HH:MM
  adults: number
  children: number
  babies: number
  language: string
  userDetails: {
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  message?: string
  isStaffOverride?: boolean
  pendingOnly?: boolean
  markAsPaid?: boolean
  paymentMethod?: string | ManualPaymentPayload
  invoiceEmail?: string
  forcedBoatId?: number
  isPrivate?: boolean
  groupChain?: number
  inheritPaymentForChain?: boolean
}

type ManualPaymentPayload = {
  provider?: string
  methodType?: string
  metadata?: {
    voucher?: {
      partnerId?: string
      partnerLabel?: string
      reference?: string
      quantity?: number
      totalAmount?: string
      autoTotal?: boolean
    }
    check?: {
      number?: string
      bank?: string
      quantity?: number
      amount?: string
    }
  }
}

// Types de résultat
export type BookingResult = {
  success: boolean
  booking?: Booking
  chainedBookings?: Array<{
    index: number
    boatId: number
    start: string
    end: string
    people: number
  }>
  overlaps?: Array<{
    index: number
    start: string
    end: string
    reason: string
  }>
  error?: string
  errorCode?: 'CONFLICT' | 'INVALID_TIME' | 'TOO_LATE' | 'NO_BOATS' | 'VALIDATION' | 'TRANSACTION'
}

export type ConflictCheckResult = {
  hasConflict: boolean
  canBook: boolean
  reason?: string
  conflicts?: Array<{
    bookingId: string
    startTime: Date
    people: number
    language: string
  }>
}

export type SlotValidationResult = {
  valid: boolean
  error?: string
  errorCode?: 'INVALID_TIME' | 'TOO_LATE'
}

/**
 * Service pour la gestion des réservations
 */
export const BookingService = {
  /**
   * Valide le créneau horaire demandé
   */
  validateSlotTime(
    wallHour: number, 
    wallMinute: number, 
    date: string, 
    isStaffOverride: boolean = false
  ): SlotValidationResult {
    const minutesTotal = wallHour * 60 + wallMinute

    // Vérifier les plages horaires autorisées
    const isMorning = minutesTotal >= MORNING_START && minutesTotal <= MORNING_END
    const isAfternoon = minutesTotal >= AFTERNOON_START && minutesTotal <= AFTERNOON_END

    if (!isMorning && !isAfternoon) {
      return {
        valid: false,
        error: `Horaire ${String(wallHour).padStart(2, '0')}:${String(wallMinute).padStart(2, '0')} impossible. (10h-11h45 / 13h30-17h45)`,
        errorCode: 'INVALID_TIME'
      }
    }

    // Vérifier le délai minimum (sauf pour staff)
    if (!isStaffOverride) {
      const todayISO = getParisTodayISO()
      if (date === todayISO) {
        const { hh: nowHour, mm: nowMinute } = getParisNowParts()
        const { instant: wallNow } = parseParisWallDate(todayISO, `${String(nowHour).padStart(2, '0')}:${String(nowMinute).padStart(2, '0')}`)
        const { instant: requestedTime } = parseParisWallDate(date, `${String(wallHour).padStart(2, '0')}:${String(wallMinute).padStart(2, '0')}`)
        
        const diffMs = requestedTime.getTime() - wallNow.getTime()
        if (diffMs < MIN_BOOKING_DELAY_MINUTES * 60 * 1000) {
          return {
            valid: false,
            error: `Réservation trop tardive: moins de ${MIN_BOOKING_DELAY_MINUTES} minutes avant le départ.`,
            errorCode: 'TOO_LATE'
          }
        }
      }
    }

    return { valid: true }
  },

  /**
   * Vérifie les conflits sur un créneau pour un bateau
   */
  async checkConflicts(
    boatId: number,
    startTime: Date,
    endTime: Date,
    language: string,
    peopleNeeded: number,
    isStaffOverride: boolean = false
  ): Promise<ConflictCheckResult> {
    const totalEndTime = addMinutes(endTime, BUFFER_TIME)

    const existingBookings = await prisma.booking.findMany({
      where: {
        boatId,
        status: { not: 'CANCELLED' },
        AND: [
          { startTime: { lt: totalEndTime } },
          { endTime: { gt: startTime } }
        ]
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        numberOfPeople: true,
        language: true,
        boat: { select: { capacity: true } }
      }
    })

    // Filtrer les vrais conflits (avec buffer)
    const realConflicts = existingBookings.filter(b => {
      const busyEnd = addMinutes(b.endTime, BUFFER_TIME)
      return areIntervalsOverlapping(
        { start: startTime, end: totalEndTime },
        { start: b.startTime, end: busyEnd }
      )
    })

    if (realConflicts.length === 0) {
      return { hasConflict: false, canBook: true }
    }

    // Staff override peut toujours réserver
    if (isStaffOverride) {
      return { 
        hasConflict: true, 
        canBook: true,
        reason: 'Staff override',
        conflicts: realConflicts.map(c => ({
          bookingId: c.id,
          startTime: c.startTime,
          people: c.numberOfPeople,
          language: c.language
        }))
      }
    }

    // Vérifier si on peut partager le créneau
    const isExactStart = realConflicts.every(b => isSameMinute(b.startTime, startTime))
    const isSameLang = realConflicts.every(b => b.language === language)
    const totalPeople = realConflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)
    const boatCapacity = realConflicts[0]?.boat?.capacity ?? 0

    if (isExactStart && isSameLang && (totalPeople + peopleNeeded <= boatCapacity)) {
      return { 
        hasConflict: true, 
        canBook: true,
        reason: 'Shared slot (same language, capacity available)',
        conflicts: realConflicts.map(c => ({
          bookingId: c.id,
          startTime: c.startTime,
          people: c.numberOfPeople,
          language: c.language
        }))
      }
    }

    return {
      hasConflict: true,
      canBook: false,
      reason: 'No capacity or language mismatch',
      conflicts: realConflicts.map(c => ({
        bookingId: c.id,
        startTime: c.startTime,
        people: c.numberOfPeople,
        language: c.language
      }))
    }
  },

  /**
   * Calcule le prix total d'une réservation
   */
  calculatePrice(adults: number, children: number, babies: number): number {
    return (adults * PRICE_ADULT) + (children * PRICE_CHILD) + (babies * PRICE_BABY)
  },

  /**
   * Génère une adresse email unique pour les réservations guichet
   */
  generateLocalEmail(firstName: string, lastName: string): string {
    const uniqueId = nanoid(6)
    const safeLast = (lastName || 'Inconnu').replace(/\s+/g, '').toLowerCase()
    const safeFirst = (firstName || 'Client').replace(/\s+/g, '').toLowerCase()
    return `guichet.${safeLast}.${safeFirst}.${uniqueId}@local.com`
  },

  /**
   * Crée une réservation
   */
  async createBooking(input: CreateBookingInput): Promise<BookingResult> {
    const {
      date,
      time,
      adults,
      children,
      babies,
      language,
      userDetails,
      message,
      isStaffOverride = false,
      pendingOnly = false,
      markAsPaid = false,
      paymentMethod,
      invoiceEmail,
      forcedBoatId,
      isPrivate = false,
      groupChain
    } = input

    // 1. Parser l'heure
    const { instant: startTime, wallHour, wallMinute } = parseParisWallDate(date, time)
    const endTime = addMinutes(startTime, TOUR_DURATION)

    // 2. Valider le créneau
    const slotValidation = this.validateSlotTime(wallHour, wallMinute, date, isStaffOverride)
    if (!slotValidation.valid) {
      return {
        success: false,
        error: slotValidation.error,
        errorCode: slotValidation.errorCode
      }
    }

    // 3. Sélectionner le bateau
    const boatSelection = await FleetService.selectBoatForSlot(wallHour, wallMinute, forcedBoatId)
    if (!boatSelection) {
      return {
        success: false,
        error: 'Aucune barque active',
        errorCode: 'NO_BOATS'
      }
    }

    const targetBoat = boatSelection.boat
    const people = adults + children + babies

    // 4. Déterminer l'email utilisateur
    const initialEmail = (userDetails.email || '').trim()
    const isPlaceholderEmail = !initialEmail || initialEmail.toLowerCase() === 'override@sweetnarcisse.local'
    const userEmail = isStaffOverride && isPlaceholderEmail 
      ? this.generateLocalEmail(userDetails.firstName, userDetails.lastName)
      : initialEmail

    if (!userEmail) {
      return {
        success: false,
        error: 'Adresse email manquante',
        errorCode: 'VALIDATION'
      }
    }

    // 5. Déterminer le statut de paiement
    const paymentMethodObject = typeof paymentMethod === 'object' ? paymentMethod as ManualPaymentPayload : null
    const paymentMethodValue = typeof paymentMethod === 'string' ? paymentMethod : paymentMethodObject?.provider
    const instantCaptureMethods = new Set(['cash', 'paypal', 'applepay', 'googlepay', 'voucher', 'check', 'ANCV', 'CityPass'])
    const shouldMarkPaid = Boolean(markAsPaid && paymentMethodValue && instantCaptureMethods.has(paymentMethodValue))

    // 6. Transaction avec vérification des conflits
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Vérifier les conflits
        const conflicts = await this.checkConflictsInTx(
          tx as unknown as typeof prisma,
          targetBoat.id,
          startTime,
          endTime,
          language,
          people,
          isStaffOverride
        )

        if (!conflicts.canBook) {
          return { ok: false as const, conflict: true }
        }

        // Calculer le nombre de passagers (privatisation remplit la capacité)
        const paxAdults = isPrivate ? targetBoat.capacity : adults
        const paxChildren = isPrivate ? 0 : children
        const paxBabies = isPrivate ? 0 : babies
        const paxTotal = paxAdults + paxChildren + paxBabies
        const priceTotal = this.calculatePrice(paxAdults, paxChildren, paxBabies)

        // Générer la référence publique
        const publicReference = await generateSeasonalBookingReference(tx as unknown as typeof prisma, startTime)

        // Créer la réservation
        const booking = await tx.booking.create({
          data: {
            date: new Date(`${date}T00:00:00.000Z`),
            startTime,
            endTime,
            numberOfPeople: paxTotal,
            adults: paxAdults,
            children: paxChildren,
            babies: paxBabies,
            language,
            totalPrice: priceTotal,
            status: pendingOnly ? 'PENDING' : 'CONFIRMED',
            message: message || null,
            boat: { connect: { id: targetBoat.id } },
            user: {
              connectOrCreate: {
                where: { email: userEmail },
                create: {
                  firstName: userDetails.firstName,
                  lastName: userDetails.lastName,
                  email: userEmail,
                  phone: userDetails.phone || null
                }
              }
            },
            invoiceEmail: invoiceEmail || null,
            isPaid: pendingOnly ? false : shouldMarkPaid,
            publicReference
          }
        })

        return { ok: true as const, booking, finalPrice: priceTotal }
      })

      if (!result.ok) {
        return {
          success: false,
          error: `Conflit sur ${targetBoat.name}`,
          errorCode: 'CONFLICT'
        }
      }

      // Log de création
      const logPrefix = isStaffOverride ? '[STAFF OVERRIDE] ' : ''
      await createLog(
        'NEW_BOOKING',
        `${logPrefix}Réservation de ${userDetails.lastName} (${isPrivate ? targetBoat.capacity : people}p${isPrivate ? ' PRIVATISATION' : ''}) sur ${targetBoat.name}`
      )

      // Invalider le cache de disponibilité
      await cacheInvalidateDate(date)

      // Gérer le chaînage de groupe si nécessaire
      let chainedBookings: BookingResult['chainedBookings'] = []
      let overlaps: BookingResult['overlaps'] = []

      if (isStaffOverride && groupChain && groupChain > targetBoat.capacity) {
        const chainResult = await this.createGroupChain(
          date,
          startTime,
          targetBoat,
          groupChain,
          input
        )
        chainedBookings = chainResult.chainedBookings
        overlaps = chainResult.overlaps
      }

      return {
        success: true,
        booking: result.booking,
        chainedBookings,
        overlaps
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Transaction booking failed:', msg)
      return {
        success: false,
        error: `Erreur technique (transaction): ${msg}`,
        errorCode: 'TRANSACTION'
      }
    }
  },

  /**
   * Vérification des conflits dans une transaction
   * (version adaptée pour utilisation dans $transaction)
   */
  async checkConflictsInTx(
    tx: typeof prisma,
    boatId: number,
    startTime: Date,
    endTime: Date,
    language: string,
    peopleNeeded: number,
    isStaffOverride: boolean
  ): Promise<ConflictCheckResult> {
    const totalEndTime = addMinutes(endTime, BUFFER_TIME)

    const existingBookings = await tx.booking.findMany({
      where: {
        boatId,
        status: { not: 'CANCELLED' },
        AND: [
          { startTime: { lt: totalEndTime } },
          { endTime: { gt: startTime } }
        ]
      },
      include: { boat: { select: { capacity: true } } }
    })

    const realConflicts = existingBookings.filter(b => {
      const busyEnd = addMinutes(b.endTime, BUFFER_TIME)
      return areIntervalsOverlapping(
        { start: startTime, end: totalEndTime },
        { start: b.startTime, end: busyEnd }
      )
    })

    if (realConflicts.length === 0) {
      return { hasConflict: false, canBook: true }
    }

    if (isStaffOverride) {
      return { hasConflict: true, canBook: true }
    }

    const isExactStart = realConflicts.every(b => isSameMinute(b.startTime, startTime))
    const isSameLang = realConflicts.every(b => b.language === language)
    const totalPeople = realConflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)
    const boatCapacity = realConflicts[0]?.boat?.capacity ?? 0

    if (isExactStart && isSameLang && (totalPeople + peopleNeeded <= boatCapacity)) {
      return { hasConflict: true, canBook: true }
    }

    return { hasConflict: true, canBook: false }
  },

  /**
   * Crée des réservations chaînées pour les grands groupes
   */
  async createGroupChain(
    date: string,
    baseStartTime: Date,
    targetBoat: Boat,
    totalGroupSize: number,
    baseInput: CreateBookingInput
  ): Promise<{
    chainedBookings: NonNullable<BookingResult['chainedBookings']>
    overlaps: NonNullable<BookingResult['overlaps']>
  }> {
    const chainedBookings: NonNullable<BookingResult['chainedBookings']> = []
    const overlaps: NonNullable<BookingResult['overlaps']> = []
    const INTERVAL = 10 // minutes entre slots

    const chunks = Math.ceil(totalGroupSize / targetBoat.capacity)

    for (let i = 1; i < chunks; i++) {
      const chainStart = addMinutes(baseStartTime, i * INTERVAL)
      const chainEnd = addMinutes(chainStart, TOUR_DURATION)
      const remainingForSlot = Math.min(
        targetBoat.capacity,
        totalGroupSize - i * targetBoat.capacity
      )

      // Vérifier les conflits pour ce slot chaîné
      const conflicting = await prisma.booking.findFirst({
        where: {
          boatId: targetBoat.id,
          date: new Date(`${date}T00:00:00.000Z`),
          startTime: { lt: chainEnd },
          endTime: { gt: chainStart },
          status: { not: 'CANCELLED' }
        }
      })

      if (conflicting) {
        overlaps.push({
          index: i,
          start: chainStart.toISOString(),
          end: chainEnd.toISOString(),
          reason: `Conflit avec réservation existante`
        })
        continue
      }

      // Créer la réservation chaînée
      try {
        const chainResult = await this.createBooking({
          ...baseInput,
          time: `${String(chainStart.getUTCHours()).padStart(2, '0')}:${String(chainStart.getUTCMinutes()).padStart(2, '0')}`,
          adults: remainingForSlot,
          children: 0,
          babies: 0,
          groupChain: undefined // Éviter la récursion
        })

        if (chainResult.success && chainResult.booking) {
          chainedBookings.push({
            index: i,
            boatId: targetBoat.id,
            start: chainStart.toISOString(),
            end: chainEnd.toISOString(),
            people: remainingForSlot
          })
        } else {
          overlaps.push({
            index: i,
            start: chainStart.toISOString(),
            end: chainEnd.toISOString(),
            reason: chainResult.error || 'Échec création'
          })
        }
      } catch (error) {
        overlaps.push({
          index: i,
          start: chainStart.toISOString(),
          end: chainEnd.toISOString(),
          reason: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    }

    return { chainedBookings, overlaps }
  },

  /**
   * Annule une réservation
   */
  async cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { boat: true, user: true }
      })

      if (!booking) {
        return { success: false, error: 'Réservation introuvable' }
      }

      if (booking.status === 'CANCELLED') {
        return { success: false, error: 'Réservation déjà annulée' }
      }

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      })

      // Invalider le cache
      const dateStr = booking.date.toISOString().split('T')[0]
      await cacheInvalidateDate(dateStr)

      await createLog(
        'BOOKING_CANCELLED',
        `Annulation réservation ${booking.publicReference} (${booking.user?.lastName || 'N/A'}) - ${reason || 'Pas de raison'}`
      )

      return { success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return { success: false, error: msg }
    }
  },

  /**
   * Récupère une réservation par ID ou référence publique
   */
  async getBooking(idOrReference: string) {
    // Essayer d'abord par UUID
    let booking = await prisma.booking.findUnique({
      where: { id: idOrReference },
      include: {
        boat: true,
        user: true,
        payments: true
      }
    })

    // Si pas trouvé, essayer par référence publique
    if (!booking) {
      booking = await prisma.booking.findFirst({
        where: { publicReference: idOrReference },
        include: {
          boat: true,
          user: true,
          payments: true
        }
      })
    }

    return booking
  }
}
