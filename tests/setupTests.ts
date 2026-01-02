import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => null)
}))

afterEach(() => {
  cleanup()
})

// Mock global fetch for reCAPTCHA and other external API calls
const originalFetch = global.fetch
const mockedFetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
  const urlString = url.toString()
  
  // Mock reCAPTCHA verification
  if (urlString.includes('google.com/recaptcha/api/siteverify')) {
    return Promise.resolve(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }
  
  // For all other requests, use the original fetch
  return originalFetch(url, init)
}) as unknown as typeof fetch

global.fetch = mockedFetch
