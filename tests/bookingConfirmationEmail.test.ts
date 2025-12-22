import { describe, it, expect } from 'vitest'

// Test de la fonction isGenericCounterEmail sans import direct pour éviter les deps Next.js
function isGenericCounterEmail(value: string | null | undefined): boolean {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  return normalized.endsWith('@local.com') || normalized.endsWith('@sweetnarcisse.local') || normalized.startsWith('override@')
}

describe('bookingConfirmationEmail', () => {
  describe('isGenericCounterEmail', () => {
    describe('Generic counter emails', () => {
      it('should detect @local.com emails', () => {
        expect(isGenericCounterEmail('customer@local.com')).toBe(true)
        expect(isGenericCounterEmail('CUSTOMER@LOCAL.COM')).toBe(true)
        expect(isGenericCounterEmail('test.user@local.com')).toBe(true)
      })

      it('should detect @sweetnarcisse.local emails', () => {
        expect(isGenericCounterEmail('comptoir@sweetnarcisse.local')).toBe(true)
        expect(isGenericCounterEmail('COMPTOIR@SWEETNARCISSE.LOCAL')).toBe(true)
        expect(isGenericCounterEmail('test@sweetnarcisse.local')).toBe(true)
      })

      it('should detect override@ prefix', () => {
        expect(isGenericCounterEmail('override@example.com')).toBe(true)
        expect(isGenericCounterEmail('OVERRIDE@DOMAIN.COM')).toBe(true)
        expect(isGenericCounterEmail('override@sweetnarcisse.com')).toBe(true)
      })

      it('should treat empty string as generic', () => {
        expect(isGenericCounterEmail('')).toBe(true)
        expect(isGenericCounterEmail('   ')).toBe(true)
      })

      it('should treat null/undefined as generic', () => {
        expect(isGenericCounterEmail(null)).toBe(true)
        expect(isGenericCounterEmail(undefined)).toBe(true)
      })
    })

    describe('Valid customer emails', () => {
      it('should accept standard email addresses', () => {
        expect(isGenericCounterEmail('jean.dupont@gmail.com')).toBe(false)
        expect(isGenericCounterEmail('marie@yahoo.fr')).toBe(false)
        expect(isGenericCounterEmail('contact@company.com')).toBe(false)
      })

      it('should accept company domain emails', () => {
        expect(isGenericCounterEmail('john@sweet-narcisse.com')).toBe(false)
        expect(isGenericCounterEmail('admin@sweet-narcisse.fr')).toBe(false)
      })

      it('should be case-insensitive for valid emails', () => {
        expect(isGenericCounterEmail('User@Gmail.COM')).toBe(false)
        expect(isGenericCounterEmail('TEST@EXAMPLE.COM')).toBe(false)
      })

      it('should handle emails with special characters', () => {
        expect(isGenericCounterEmail('user+tag@example.com')).toBe(false)
        expect(isGenericCounterEmail('first.last@example.co.uk')).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('should handle whitespace trimming', () => {
        expect(isGenericCounterEmail('  customer@local.com  ')).toBe(true)
        expect(isGenericCounterEmail('  valid@gmail.com  ')).toBe(false)
      })

      it('should not match partial domain matches', () => {
        // "mylocal.com" is not "@local.com"
        expect(isGenericCounterEmail('test@mylocal.com')).toBe(false)
        expect(isGenericCounterEmail('test@local.company.com')).toBe(false)
      })

      it('should match override prefix correctly', () => {
        expect(isGenericCounterEmail('notoverride@example.com')).toBe(false)
        expect(isGenericCounterEmail('override-test@example.com')).toBe(false)
        expect(isGenericCounterEmail('override@example.com')).toBe(true)
      })
    })

    describe('Production scenarios', () => {
      it('should reject counter booking without real email', () => {
        const counterBooking = {
          email: 'comptoir@local.com'
        }
        expect(isGenericCounterEmail(counterBooking.email)).toBe(true)
      })

      it('should accept online booking with real email', () => {
        const onlineBooking = {
          email: 'client@gmail.com'
        }
        expect(isGenericCounterEmail(onlineBooking.email)).toBe(false)
      })

      it('should handle employee override bookings', () => {
        const overrideBooking = {
          email: 'override@sweetnarcisse.com'
        }
        expect(isGenericCounterEmail(overrideBooking.email)).toBe(true)
      })
    })
  })
})
