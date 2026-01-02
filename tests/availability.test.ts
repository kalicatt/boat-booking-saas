import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computeAvailability } from '@/lib/availability'
import type { Boat, Booking, BlockedInterval } from '@prisma/client'

// Mock time utilities
vi.mock('@/lib/time', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/time')>()
  return {
    ...actual,
    getParisTodayISO: () => '2025-12-22',
    getParisNowMinutes: () => 600 // 10:00
  }
})

describe('computeAvailability', () => {
  const mockBoat: Pick<Boat, 'id' | 'capacity'> = {
    id: 1,
    capacity: 6
  }

  const mockBoat2: Pick<Boat, 'id' | 'capacity'> = {
    id: 2,
    capacity: 6
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic availability', () => {
    it('should return empty slots when no boats available', () => {
      const result = computeAvailability({
        dateParam: '2025-12-22',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [],
        bookings: [],
        blocks: []
      })

      expect(result.availableSlots).toEqual([])
    })

    it('should generate slots during morning hours (10:00-11:45)', () => {
      const result = computeAvailability({
        dateParam: '2025-12-23', // Future date
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      expect(result.availableSlots.length).toBeGreaterThan(0)
      const morningSlots = result.availableSlots.filter(slot => {
        const [hh] = slot.split(':').map(Number)
        return hh >= 10 && hh < 12
      })
      expect(morningSlots.length).toBeGreaterThan(0)
    })

    it('should generate slots during afternoon hours (13:30-17:45)', () => {
      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      const afternoonSlots = result.availableSlots.filter(slot => {
        const [hh] = slot.split(':').map(Number)
        return hh >= 13 && hh < 18
      })
      expect(afternoonSlots.length).toBeGreaterThan(0)
    })

    it('should not generate slots outside operating hours', () => {
      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      const invalidSlots = result.availableSlots.filter(slot => {
        const [hh] = slot.split(':').map(Number)
        return hh < 10 || hh >= 18
      })
      expect(invalidSlots).toEqual([])
    })
  })

  describe('Booking conflicts', () => {
    it('should exclude slots with existing bookings', () => {
      const existingBooking: Pick<Booking, 'boatId' | 'startTime' | 'endTime' | 'language' | 'numberOfPeople'> = {
        boatId: 1,
        // 10:00 Paris (winter) == 09:00Z
        startTime: new Date('2025-12-23T09:00:00.000Z'),
        endTime: new Date('2025-12-23T09:25:00.000Z'),
        language: 'en', // Different language to block
        numberOfPeople: 4
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [existingBooking],
        blocks: []
      })

      expect(result.availableSlots).not.toContain('10:00')
    })

    it('should allow same-time booking if same language and capacity available', () => {
      const existingBooking: Pick<Booking, 'boatId' | 'startTime' | 'endTime' | 'language' | 'numberOfPeople'> = {
        boatId: 1,
        // 10:00 Paris (winter) == 09:00Z
        startTime: new Date('2025-12-23T09:00:00.000Z'),
        endTime: new Date('2025-12-23T09:25:00.000Z'),
        language: 'fr',
        numberOfPeople: 2
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2, // 2 + 2 = 4 <= 6 capacity
        boats: [mockBoat],
        bookings: [existingBooking],
        blocks: []
      })

      expect(result.availableSlots).toContain('10:00')
    })

    it('should reject same-time booking if capacity exceeded', () => {
      const existingBooking: Pick<Booking, 'boatId' | 'startTime' | 'endTime' | 'language' | 'numberOfPeople'> = {
        boatId: 1,
        // 10:00 Paris (winter) == 09:00Z
        startTime: new Date('2025-12-23T09:00:00.000Z'),
        endTime: new Date('2025-12-23T09:25:00.000Z'),
        language: 'fr',
        numberOfPeople: 5
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 3, // 5 + 3 = 8 > 6 capacity
        boats: [mockBoat],
        bookings: [existingBooking],
        blocks: []
      })

      expect(result.availableSlots).not.toContain('10:00')
    })

    it('should reject same-time booking if different language', () => {
      const existingBooking: Pick<Booking, 'boatId' | 'startTime' | 'endTime' | 'language' | 'numberOfPeople'> = {
        boatId: 1,
        // 10:00 Paris (winter) == 09:00Z
        startTime: new Date('2025-12-23T09:00:00.000Z'),
        endTime: new Date('2025-12-23T09:25:00.000Z'),
        language: 'en',
        numberOfPeople: 2
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr', // Different language
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [existingBooking],
        blocks: []
      })

      expect(result.availableSlots).not.toContain('10:00')
    })
  })

  describe('Blocked intervals', () => {
    it('should return empty slots for full-day block', () => {
      const fullDayBlock: Pick<BlockedInterval, 'scope' | 'start' | 'end' | 'reason'> = {
        scope: 'day',
        start: new Date('2025-12-23T00:00:00.000Z'),
        end: new Date('2025-12-23T23:59:59.999Z'),
        reason: 'Maintenance'
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: [fullDayBlock]
      })

      expect(result.availableSlots).toEqual([])
      expect(result.blockedReason).toBe('Maintenance')
    })

    it('should exclude slots overlapping with time blocks', () => {
      const timeBlock: Pick<BlockedInterval, 'scope' | 'start' | 'end' | 'reason'> = {
        scope: 'time',
        // Block 10:00-11:00 Paris (winter) == 09:00-10:00Z
        start: new Date('2025-12-23T09:00:00.000Z'),
        end: new Date('2025-12-23T10:00:00.000Z'),
        reason: 'Private event'
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: [timeBlock]
      })

      expect(result.availableSlots).not.toContain('10:00')
      expect(result.availableSlots).not.toContain('10:15')
      expect(result.availableSlots).not.toContain('10:30')
      expect(result.availableSlots).not.toContain('10:45')
    })
  })

  describe('Multi-boat scenarios', () => {
    it('should distribute slots across multiple boats', () => {
      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat, mockBoat2],
        bookings: [],
        blocks: []
      })

      // With 2 boats, should have more slots than with 1
      const singleBoatResult = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      expect(result.availableSlots.length).toBeGreaterThan(singleBoatResult.availableSlots.length)
    })

    it('should handle booking on specific boat', () => {
      const boat1Booking: Pick<Booking, 'boatId' | 'startTime' | 'endTime' | 'language' | 'numberOfPeople'> = {
        boatId: 1,
        // 10:00 Paris (winter) == 09:00Z
        startTime: new Date('2025-12-23T09:00:00.000Z'),
        endTime: new Date('2025-12-23T09:25:00.000Z'),
        language: 'fr',
        numberOfPeople: 6
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat, mockBoat2],
        bookings: [boat1Booking],
        blocks: []
      })

      // Boat 2 has offset, so 10:05 should be available
      expect(result.availableSlots).toContain('10:05')
    })
  })

  describe('Minimum booking delay (today)', () => {
    it('should exclude slots within minimum booking delay for today', () => {
      // Mock returns 10:00 for current time
      const result = computeAvailability({
        dateParam: '2025-12-22', // Today
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      // MIN_BOOKING_DELAY = 30min, so slots < 10:30 excluded
      expect(result.availableSlots).not.toContain('10:00')
      expect(result.availableSlots).not.toContain('10:15')
      // 10:30 should be available (30min after 10:00)
      expect(result.availableSlots).toContain('10:30')
    })

    it('should allow future dates without delay restrictions', () => {
      const result = computeAvailability({
        dateParam: '2025-12-23', // Tomorrow
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      // Should have 10:00 available
      expect(result.availableSlots).toContain('10:00')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty bookings and blocks', () => {
      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      expect(result.availableSlots.length).toBeGreaterThan(0)
      expect(result.blockedReason).toBeUndefined()
    })

    it('should handle maximum capacity request', () => {
      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 6, // Full boat
        boats: [mockBoat],
        bookings: [],
        blocks: []
      })

      expect(result.availableSlots.length).toBeGreaterThan(0)
    })

    it('should return blocked reason when no slots and blocks exist', () => {
      const timeBlock: Pick<BlockedInterval, 'scope' | 'start' | 'end' | 'reason'> = {
        scope: 'time',
        start: new Date('2025-12-23T00:00:00.000Z'),
        end: new Date('2025-12-23T23:59:59.999Z'),
        reason: 'Weather alert'
      }

      const result = computeAvailability({
        dateParam: '2025-12-23',
        requestedLang: 'fr',
        peopleNeeded: 2,
        boats: [mockBoat],
        bookings: [],
        blocks: [timeBlock]
      })

      expect(result.availableSlots).toEqual([])
      expect(result.blockedReason).toBe('Weather alert')
    })
  })
})
