import { describe, it, expect, vi } from 'vitest'
import { POST as contactPost } from '@/app/api/contact/private/route'

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn(() => Promise.resolve({ id: 'test-email-id' }))
    }
  }))
}))

// Mock le rate limiter
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 5 })),
  getClientIp: vi.fn(() => '127.0.0.1')
}))

// Mock le mailer
vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn(() => Promise.resolve({ accepted: ['contact@sweetnarcisse.com'] }))
}))

describe('POST /api/contact/private', () => {
  it('should reject contact without required fields', async () => {
    const request = new Request('http://localhost:3000/api/contact/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    const response = await contactPost(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should reject contact with invalid email', async () => {
    const request = new Request('http://localhost:3000/api/contact/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'invalid-email',
        phone: '+33612345678',
        subject: 'Test',
        message: 'Test message'
      })
    })

    const response = await contactPost(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toContain('email')
  })

  it('should reject contact with short message', async () => {
    const request = new Request('http://localhost:3000/api/contact/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+33612345678',
        subject: 'Test',
        message: 'Hi' // Too short
      })
    })

    const response = await contactPost(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toMatch(/message|caractères/)
  })

  it('should accept valid contact request', async () => {
    const request = new Request('http://localhost:3000/api/contact/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+33612345678',
        subject: 'Demande d\'information',
        message: 'Bonjour, je souhaite obtenir des informations sur vos services pour une privatisation.'
      })
    })

    const response = await contactPost(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
