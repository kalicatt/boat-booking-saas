import { describe, it, expect, vi } from 'vitest'
import { POST as contactPost } from '@/app/api/contact/group/route'

// Mock Resend
vi.mock('resend', () => {
  class Resend {
    public emails = {
      send: vi.fn(() => Promise.resolve({ id: 'test-email-id' }))
    }

    constructor(...args: unknown[]) {
      void args
    }
  }

  return { Resend }
})

// Mock le rate limiter
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 5 })),
  enhancedRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 5 })),
  getClientIp: vi.fn(() => '127.0.0.1')
}))

// Mock le mailer
vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn(() => Promise.resolve({ accepted: ['contact@sweetnarcisse.com'] }))
}))

describe('POST /api/contact/group', () => {
  process.env.RESEND_API_KEY = 'test-resend-key'

  // Mock captcha verification fetch used by the route
  vi.stubGlobal('fetch', vi.fn(async () => {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }))

  it('should reject contact without required fields', async () => {
    const request = new Request('http://localhost:3000/api/contact/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    const response = await contactPost(request)
    expect(response.status).toBe(422)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should reject contact with invalid email', async () => {
    const request = new Request('http://localhost:3000/api/contact/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '+33612345678',
        message: 'Test message',
        people: 10,
        captchaToken: '12345678901'
      })
    })

    const response = await contactPost(request)
    expect(response.status).toBe(422)
  })

  it('should accept valid contact request', async () => {
    const request = new Request('http://localhost:3000/api/contact/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+33612345678',
        message: 'Bonjour, je souhaite obtenir des informations sur une réservation de groupe.',
        people: 10,
        company: 'ACME',
        reason: 'Séminaire',
        eventDate: '2026-02-01',
        eventTime: '14:00',
        budget: '500€',
        captchaToken: '12345678901'
      })
    })

    const response = await contactPost(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
