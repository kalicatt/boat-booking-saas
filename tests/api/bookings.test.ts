import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { POST as bookingsPost } from '@/app/api/bookings/route'
import { prisma } from '@/lib/prisma'
import type { Boat } from '@prisma/client'

// Mock la session
vi.mock('@/auth', () => ({
  auth: vi.fn()
}))

// Mock le rate limiter
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 10 })),
  enhancedRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 10 })),
  getClientIp: vi.fn(() => '127.0.0.1')
}))

// Mock le mailer
vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn(() => Promise.resolve({ accepted: ['test@example.com'] })),
  sendBookingConfirmationEmail: vi.fn(() => Promise.resolve({ accepted: ['test@example.com'] }))
}))

// Mock le booking reference
vi.mock('@/lib/bookingReference', () => ({
  generateSeasonalBookingReference: vi.fn(() => `REF-${Date.now()}`)
}))

// Mock les metrics
vi.mock('@/lib/metrics', () => ({
  recordBooking: vi.fn()
}))

describe('POST /api/bookings', () => {
  let testBoat: Boat

  beforeAll(async () => {
    // Créer un bateau de test (ou récupérer un existant)
    const existingBoat = await prisma.boat.findFirst({
      where: { name: 'Test Boat Integration' }
    })
    
    if (existingBoat) {
      testBoat = existingBoat
    } else {
      testBoat = await prisma.boat.create({
        data: {
          name: 'Test Boat Integration',
          capacity: 12,
          status: 'ACTIVE'
        }
      })
    }
  })

  afterAll(async () => {
    // Cleanup - delete all bookings for test boat
    if (testBoat) {
      await prisma.booking.deleteMany({
        where: { boatId: testBoat.id }
      })
      await prisma.boat.deleteMany({
        where: { name: 'Test Boat Integration' }
      }).catch(() => {}) // Ignore error if already deleted
    }
    
    // Cleanup test users by email pattern
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: 'integration-test' } }
    })
    for (const user of testUsers) {
      await prisma.booking.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })


  it('should reject booking with missing fields', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing required fields
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(422) // Changed from 400 to 422 for validation errors
    
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should reject booking with invalid email', async () => {
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateStr,
        time: '10:00',
        adults: 2,
        children: 0,
        babies: 0,
        language: 'en',
        userDetails: {
          email: 'invalid-email',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+33612345678'
        },
        captchaToken: 'test-token'
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(422)
    
    const data = await response.json()
    expect(data.error).toBeTruthy()
  })

  it('should reject booking exceeding boat capacity', async () => {
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateStr,
        time: '10:00',
        adults: 20, // Exceeds capacity
        children: 0,
        babies: 0,
        language: 'en',
        userDetails: {
          email: 'integration-test-capacity@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+33612345678'
        },
        captchaToken: 'test-token'
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBeTruthy()
  })



  it('should create a valid pending booking', async () => {
    const email = `integration-test-${Date.now()}@example.com`
    
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateStr,
        time: '10:00',
        adults: 2,
        children: 2,
        babies: 0,
        pendingOnly: true,
        language: 'en',
        // Use staff override + forced boat to keep the test deterministic
        // even if the local dev DB contains existing bookings.
        isStaffOverride: true,
        forcedBoatId: testBoat.id,
        userDetails: {
          email,
          firstName: 'John',
          lastName: 'Doe',
          phone: '+33612345678'
        }
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('booking')
    expect(data.booking).toHaveProperty('publicReference')
    expect(data.status).toBe('PENDING')

    // Vérifier en DB - chercher par l'utilisateur créé
    const user = await prisma.user.findUnique({
      where: { email }
    })
    expect(user).toBeTruthy()
    
    const booking = await prisma.booking.findFirst({
      where: { userId: user?.id }
    })
    
    expect(booking).toBeTruthy()
    expect(booking?.status).toBe('PENDING')
    expect(booking?.numberOfPeople).toBe(4)
    
    // Cleanup - delete booking first, then user
    if (booking) {
      await prisma.booking.delete({ where: { id: booking.id } })
    }
    if (user) {
      await prisma.user.delete({ where: { id: user.id } })
    }
  })


  it('should prevent double booking on same slot', async () => {
    // Get a future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const dateStr = futureDate.toISOString().split('T')[0]

    // Créer un utilisateur pour la première réservation
    const firstUser = await prisma.user.create({
      data: {
        email: `first-booking-${Date.now()}@example.com`,
        firstName: 'First',
        lastName: 'User',
        role: 'CLIENT'
      }
    })

    // Créer une première réservation confirmée
    await prisma.booking.create({
      data: {
        publicReference: 'REF-FIRST-' + Date.now(),
        date: futureDate,
        // 14:00 Paris (winter) == 13:00Z
        startTime: new Date(`${dateStr}T13:00:00Z`),
        endTime: new Date(`${dateStr}T13:25:00Z`),
        numberOfPeople: 10,
        adults: 10,
        children: 0,
        babies: 0,
        status: 'CONFIRMED',
        totalPrice: 90,
        language: 'fr',
        userId: firstUser.id,
        boatId: testBoat.id
      }
    })

    // Tenter une seconde réservation sur le même créneau
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateStr,
        time: '14:00',
        adults: 3,
        children: 0,
        babies: 0,
        language: 'en',
        userDetails: {
          email: 'second-booking@example.com',
          firstName: 'Second',
          lastName: 'User',
          phone: '+33612345679'
        },
        captchaToken: 'test-token'
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(409)
    
    const data = await response.json()
    expect(data.error).toBeTruthy()

    // Cleanup
    await prisma.booking.deleteMany({ 
      where: { userId: firstUser.id }
    })
    await prisma.user.delete({ where: { id: firstUser.id } })
    
    // Cleanup second user if created
    const secondUser = await prisma.user.findUnique({
      where: { email: 'second-booking@example.com' }
    })
    if (secondUser) {
      await prisma.booking.deleteMany({ where: { userId: secondUser.id } })
      await prisma.user.delete({ where: { id: secondUser.id } })
    }
  })
})
