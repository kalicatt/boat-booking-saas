import { describe, it, expect } from 'vitest'
import { localToE164, isPossibleLocalDigits, isValidE164, formatInternational, normalizeIncoming } from '../lib/phone'

describe('phone helpers', () => {
  it('converts local digits with leading 0 to E.164', () => {
    const e164 = localToE164('+33', '0612345678')
    expect(e164).toBe('+33612345678')
  })

  it('rejects too short local digits', () => {
    expect(isPossibleLocalDigits('123')).toBe(false)
  })

  it('rejects too long local digits', () => {
    expect(isPossibleLocalDigits('1'.repeat(20))).toBe(false)
  })

  it('accepts proper length local digits', () => {
    expect(isPossibleLocalDigits('123456')).toBe(true)
    expect(isPossibleLocalDigits('12345678901234')).toBe(true)
  })

  it('validates real French mobile number', () => {
    const e164 = localToE164('+33', '612345678')
    expect(isValidE164(e164)).toBe(true)
  })

  it('formats international number', () => {
    const e164 = '+33612345678'
    const intl = formatInternational(e164)
    expect(intl).toContain('+33')
  })

  it('normalizes incoming already valid number', () => {
    const n = normalizeIncoming('+33612345678')
    expect(n).toBe('+33612345678')
  })

  it('leaves invalid number unchanged', () => {
    const bad = '+330123' // invalid format
    expect(normalizeIncoming(bad)).toBe(bad)
  })
})
