// Mock for next-auth/lib/env module to avoid next/server dependency issues
const env = {}
export default env

// Also export common next-auth env variables
export const AUTH_URL = 'http://localhost:3000'
export const AUTH_SECRET = 'test-secret'
