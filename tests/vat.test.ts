import { describe, it, expect } from 'vitest'
import { computeVatFromGross, getVatRate } from '@/lib/vat'

describe('VAT helper', () => {
  it('defaults to 20%', () => {
    const rate = getVatRate()
    expect(rate).toBe(20)
  })
  it('computes net/vat/gross from gross at 20%', () => {
    const v = computeVatFromGross(1200)
    expect(v.net).toBe(1000)
    expect(v.vat).toBe(200)
    expect(v.gross).toBe(1200)
  })
})
