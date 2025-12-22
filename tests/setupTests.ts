import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock global fetch for reCAPTCHA and other external API calls
const originalFetch = global.fetch
global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
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
}) as any
