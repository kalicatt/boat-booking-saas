/**
 * FleetService - Gestion de la flotte de barques
 * 
 * Responsabilités:
 * - Rotation des barques selon l'heure
 * - Calcul de capacité disponible
 * - Sélection de barque pour une réservation
 */

import { prisma } from '@/lib/prisma'
import { withCache, CACHE_TTL } from '@/lib/cache'
import type { Boat, Booking } from '@prisma/client'

// --- Configuration ---
const OPEN_TIME = '10:00'
const INTERVAL = 10 // minutes entre chaque slot

export type BoatRotationResult = {
  boat: Boat
  index: number
  reason: 'rotation' | 'forced' | 'fallback'
}

export type FleetCapacityResult = {
  totalCapacity: number
  availableCapacity: number
  boats: Array<{
    id: number
    name: string
    capacity: number
    currentOccupancy: number
  }>
}

export type SlotCapacityResult = {
  boatId: number
  boatName: string
  capacity: number
  currentOccupancy: number
  remainingCapacity: number
  canAccommodate: boolean
  bookings: Array<{
    id: string
    people: number
    language: string
  }>
}

/**
 * Service pour la gestion de la flotte
 */
export const FleetService = {
  /**
   * Récupère tous les bateaux actifs (avec cache)
   */
  async getActiveBoats(): Promise<Boat[]> {
    return withCache(
      'boats:active',
      () => prisma.boat.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { id: 'asc' }
      }),
      CACHE_TTL.BOATS
    )
  },

  /**
   * Calcule l'index de rotation du bateau pour un créneau donné
   * @param wallHour - Heure murale (ex: 10, 14)
   * @param wallMinute - Minutes murales (ex: 0, 30)
   * @param totalBoats - Nombre total de bateaux actifs
   */
  calculateBoatRotationIndex(
    wallHour: number, 
    wallMinute: number, 
    totalBoats: number
  ): number {
    const [startHour, startMin] = OPEN_TIME.split(':').map(Number)
    const startTimeInMinutes = startHour * 60 + startMin
    const currentTimeInMinutes = wallHour * 60 + wallMinute
    
    const slotsElapsed = (currentTimeInMinutes - startTimeInMinutes) / INTERVAL
    return ((Math.floor(slotsElapsed) % totalBoats) + totalBoats) % totalBoats
  },

  /**
   * Sélectionne le bateau approprié pour un créneau
   * @param wallHour - Heure murale
   * @param wallMinute - Minutes murales
   * @param forcedBoatId - ID du bateau forcé (optionnel, staff override)
   */
  async selectBoatForSlot(
    wallHour: number,
    wallMinute: number,
    forcedBoatId?: number
  ): Promise<BoatRotationResult | null> {
    const boats = await this.getActiveBoats()
    
    if (boats.length === 0) {
      return null
    }

    // Si un bateau est forcé par le staff
    if (forcedBoatId !== undefined && Number.isFinite(forcedBoatId)) {
      const forcedBoat = boats.find(b => b.id === forcedBoatId)
      if (forcedBoat) {
        return {
          boat: forcedBoat,
          index: boats.indexOf(forcedBoat),
          reason: 'forced'
        }
      }
    }

    // Rotation automatique
    const index = this.calculateBoatRotationIndex(wallHour, wallMinute, boats.length)
    return {
      boat: boats[index],
      index,
      reason: 'rotation'
    }
  },

  /**
   * Calcule la capacité disponible sur un créneau pour un bateau
   */
  async getSlotCapacity(
    boatId: number,
    startTime: Date,
    endTime: Date
  ): Promise<SlotCapacityResult | null> {
    const boat = await prisma.boat.findUnique({
      where: { id: boatId }
    })

    if (!boat) {
      return null
    }

    // Récupère les réservations sur ce créneau
    const bookings = await prisma.booking.findMany({
      where: {
        boatId,
        status: { not: 'CANCELLED' },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      },
      select: {
        id: true,
        numberOfPeople: true,
        language: true
      }
    })

    const currentOccupancy = bookings.reduce((sum, b) => sum + b.numberOfPeople, 0)
    const remainingCapacity = boat.capacity - currentOccupancy

    return {
      boatId: boat.id,
      boatName: boat.name,
      capacity: boat.capacity,
      currentOccupancy,
      remainingCapacity,
      canAccommodate: remainingCapacity > 0,
      bookings: bookings.map(b => ({
        id: b.id,
        people: b.numberOfPeople,
        language: b.language
      }))
    }
  },

  /**
   * Calcule la capacité totale de la flotte pour un créneau
   */
  async getFleetCapacityForSlot(
    startTime: Date,
    endTime: Date
  ): Promise<FleetCapacityResult> {
    const boats = await this.getActiveBoats()
    
    const capacities = await Promise.all(
      boats.map(async boat => {
        const slotCapacity = await this.getSlotCapacity(boat.id, startTime, endTime)
        return {
          id: boat.id,
          name: boat.name,
          capacity: boat.capacity,
          currentOccupancy: slotCapacity?.currentOccupancy ?? 0
        }
      })
    )

    const totalCapacity = capacities.reduce((sum, b) => sum + b.capacity, 0)
    const totalOccupancy = capacities.reduce((sum, b) => sum + b.currentOccupancy, 0)

    return {
      totalCapacity,
      availableCapacity: totalCapacity - totalOccupancy,
      boats: capacities
    }
  },

  /**
   * Trouve un bateau avec assez de capacité pour un nombre de personnes
   * @param peopleNeeded - Nombre de personnes à placer
   * @param startTime - Début du créneau
   * @param endTime - Fin du créneau
   * @param preferredBoatId - ID du bateau préféré (optionnel)
   * @param language - Langue de la réservation (pour regroupement)
   */
  async findAvailableBoat(
    peopleNeeded: number,
    startTime: Date,
    endTime: Date,
    preferredBoatId?: number,
    language?: string
  ): Promise<{ boat: Boat; remainingCapacity: number } | null> {
    const boats = await this.getActiveBoats()
    
    // Essayer d'abord le bateau préféré
    if (preferredBoatId) {
      const preferred = boats.find(b => b.id === preferredBoatId)
      if (preferred) {
        const capacity = await this.getSlotCapacity(preferred.id, startTime, endTime)
        if (capacity && capacity.remainingCapacity >= peopleNeeded) {
          // Vérifier la compatibilité de langue si nécessaire
          if (language && capacity.bookings.length > 0) {
            const allSameLanguage = capacity.bookings.every(b => b.language === language)
            if (allSameLanguage) {
              return { boat: preferred, remainingCapacity: capacity.remainingCapacity }
            }
          } else {
            return { boat: preferred, remainingCapacity: capacity.remainingCapacity }
          }
        }
      }
    }

    // Sinon chercher un autre bateau disponible
    for (const boat of boats) {
      if (boat.id === preferredBoatId) continue // déjà testé
      
      const capacity = await this.getSlotCapacity(boat.id, startTime, endTime)
      if (capacity && capacity.remainingCapacity >= peopleNeeded) {
        return { boat, remainingCapacity: capacity.remainingCapacity }
      }
    }

    return null
  }
}
