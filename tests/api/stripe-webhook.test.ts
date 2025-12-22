import { describe, it, expect, vi, beforeAll } from 'vitest'
import { POST as stripeWebhook } from '@/app/api/payments/stripe/webhook/route'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

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
  
  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET
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
    expect(data.error).toContain('signature') || expect(data.error).toContain('Webhook')
  })

  it('should handle payment_intent.succeeded event', async () => {
    // Créer une réservation de test en attente
    const booking = await prisma.booking.create({
      data: {
        bookingReference: `TEST-WEBHOOK-${Date.now()}`,
        email: 'webhook-test@example.com',
        firstName: 'Webhook',
        lastName: 'Test',
        phone: '+33612345678',
        people: 2,
        status: 'PENDING',
        totalAmount: 50,
        timeSlotId: 1, // Assumons qu'un slot existe
        stripePaymentIntentId: 'pi_test_webhook_123'
      }
    })

    const webhookPayload = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_webhook_123',
          metadata: {
            bookingId: booking.id.toString()
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
