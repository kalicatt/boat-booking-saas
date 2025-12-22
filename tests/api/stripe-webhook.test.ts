import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { POST as stripeWebhook } from '@/app/api/payments/stripe/webhook/route'
import { prisma } from '@/lib/prisma'
import type { User, Boat } from '@prisma/client'

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      webhooks: {
        constructEvent: vi.fn((body, sig, secret) => {
          // Simuler un événement Stripe valide
          return {
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_123',
                metadata: {
                  bookingId: 'test-booking-id'
                }
              }
            }
          }
        })
      }
    }))
  }
})

describe('POST /api/payments/stripe/webhook', () => {
  const STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  let testUser: User
  let testBoat: Boat
  
  beforeAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET

    // Créer un utilisateur de test
    testUser = await prisma.user.upsert({
      where: { email: 'webhook-test@sweetnarcisse.com' },
      update: {},
      create: {
        email: 'webhook-test@sweetnarcisse.com',
        firstName: 'Webhook',
        lastName: 'Test',
        role: 'CLIENT'
      }
    })

    // Créer un bateau de test (ou récupérer un existant)
    const existingBoat = await prisma.boat.findFirst({
      where: { name: 'Test Boat Webhook' }
    })
    
    if (existingBoat) {
      testBoat = existingBoat
    } else {
      testBoat = await prisma.boat.create({
        data: {
          name: 'Test Boat Webhook',
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
        where: { name: 'Test Boat Webhook' }
      }).catch(() => {})
    }
    
    // Cleanup test users
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: 'webhook-test' } }
    })
    for (const user of testUsers) {
      await prisma.booking.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    }
  })

  it('should reject webhook without stripe-signature header', async () => {
    const request = new Request('http://localhost:3000/api/payments/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment_intent.succeeded' })
    })

    const response = await stripeWebhook(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toMatch(/signature|Webhook/)
  })



  it('should handle payment_intent.succeeded event', async () => {
    // Créer une réservation de test en attente
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    const dateStr = futureDate.toISOString().split('T')[0]

    const booking = await prisma.booking.create({
      data: {
        publicReference: `TEST-WEBHOOK-${Date.now()}`,
        date: futureDate,
        startTime: new Date(`${dateStr}T10:00:00Z`),
        endTime: new Date(`${dateStr}T10:25:00Z`),
        numberOfPeople: 2,
        adults: 2,
        children: 0,
        babies: 0,
        status: 'PENDING',
        totalPrice: 18,
        language: 'fr',
        userId: testUser.id,
        boatId: testBoat.id
      }
    })

    const webhookPayload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_webhook_123',
          metadata: {
            bookingId: booking.id
          }
        }
      }
    })

    const request = new Request('http://localhost:3000/api/payments/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: webhookPayload
    })

    const response = await stripeWebhook(request)
    expect(response.status).toBe(200)

    // Vérifier que le booking est confirmé
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id }
    })
    
    expect(updatedBooking?.status).toBe('CONFIRMED')

    // Cleanup
    await prisma.booking.delete({ where: { id: booking.id } })
  })

  it('should return 200 for unsupported event types', async () => {
    const request = new Request('http://localhost:3000/api/payments/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify({
        type: 'customer.created',
        data: { object: { id: 'cus_123' } }
      })
    })

    const response = await stripeWebhook(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.received).toBe(true)
  })
})
