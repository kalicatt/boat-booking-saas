import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { POST as bookingsPost } from '@/app/api/bookings/route'
import { prisma } from '@/lib/prisma'
import type { Boat, TimeSlot } from '@prisma/client'

// Mock la session
vi.mock('@/auth', () => ({
  auth: vi.fn()
}))

// Mock le rate limiter
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 10 })),
  getClientIp: vi.fn(() => '127.0.0.1')
}))

// Mock le mailer
vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn(() => Promise.resolve({ accepted: ['test@example.com'] }))
}))

describe('POST /api/bookings', () => {
  let testBoat: Boat
  let testTimeSlot: TimeSlot

  beforeAll(async () => {
    // Créer un bateau de test
    testBoat = await prisma.boat.upsert({
      where: { name: 'Test Boat Integration' },
      update: {},
      create: {
        name: 'Test Boat Integration',
        capacity: 12,
        status: 'ACTIVE',
        lastInspectionDate: new Date()
      }
    })

    // Créer un créneau de test (demain 10h)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    testTimeSlot = await prisma.timeSlot.upsert({
      where: {
        boatId_startTime: {
          boatId: testBoat.id,
          startTime: tomorrow
        }
      },
      update: {},
      create: {
        boatId: testBoat.id,
        startTime: tomorrow,
        isAvailable: true,
        duration: 120
      }
    })
  })

  afterAll(async () => {
    // Cleanup
    await prisma.booking.deleteMany({
      where: { email: { contains: 'integration-test@' } }
    })
    await prisma.timeSlot.deleteMany({
      where: { boatId: testBoat.id }
    })
    await prisma.boat.delete({
      where: { id: testBoat.id }
    })
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
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should reject booking with invalid email', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeSlotId: testTimeSlot.id,
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+33612345678',
        people: 2,
        language: 'en'
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toContain('email')
  })

  it('should reject booking exceeding boat capacity', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeSlotId: testTimeSlot.id,
        email: 'integration-test-capacity@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+33612345678',
        people: 20, // Exceeds capacity of 12
        language: 'en'
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toContain('capacity') || expect(data.error).toContain('personnes')
  })

  it('should create a valid pending booking', async () => {
    const email = `integration-test-${Date.now()}@example.com`
    
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeSlotId: testTimeSlot.id,
        email,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+33612345678',
        people: 4,
        language: 'en'
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('bookingReference')
    expect(data).toHaveProperty('clientSecret')
    expect(data.status).toBe('PENDING')

    // Vérifier en DB
    const booking = await prisma.booking.findFirst({
      where: { email }
    })
    
    expect(booking).toBeTruthy()
    expect(booking?.status).toBe('PENDING')
    expect(booking?.people).toBe(4)
    expect(booking?.firstName).toBe('John')
  })

  it('should prevent double booking on same slot', async () => {
    // Créer une première réservation confirmée
    const slot = await prisma.timeSlot.create({
      data: {
        boatId: testBoat.id,
        startTime: new Date('2025-12-25T14:00:00Z'),
        isAvailable: true,
        duration: 120
      }
    })

    await prisma.booking.create({
      data: {
        timeSlotId: slot.id,
        email: 'first-booking@example.com',
        firstName: 'First',
        lastName: 'User',
        phone: '+33612345678',
        people: 10,
        status: 'CONFIRMED',
        bookingReference: 'REF-FIRST',
        totalAmount: 100
      }
    })

    // Tenter une seconde réservation sur le même créneau
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeSlotId: slot.id,
        email: 'second-booking@example.com',
        firstName: 'Second',
        lastName: 'User',
        phone: '+33612345679',
        people: 5,
        language: 'en'
      })
    })

    const response = await bookingsPost(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toContain('disponible') || expect(data.error).toContain('available')

    // Cleanup
    await prisma.booking.deleteMany({ where: { timeSlotId: slot.id } })
    await prisma.timeSlot.delete({ where: { id: slot.id } })
  })
})
