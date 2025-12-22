import { describe, it, expect, vi } from 'vitest'
import { GET as availabilityGet } from '@/app/api/availability/route'

describe('GET /api/availability', () => {
  it('should return 400 without required parameters', async () => {
    const request = new Request('http://localhost:3000/api/availability')
    
    const response = await availabilityGet(request)
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('Params manquants')
  })

  it('should return empty slots when people count is 0', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().split('T')[0]
    
    const request = new Request(`http://localhost:3000/api/availability?date=${dateStr}&lang=en&adults=0&children=0&babies=0`)
    
    const response = await availabilityGet(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.availableSlots).toEqual([])
  })

  it('should return available slots for valid request', async () => {
    // Date dans 7 jours
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().split('T')[0]
    
    const request = new Request(`http://localhost:3000/api/availability?date=${dateStr}&lang=en&adults=2&children=0&babies=0`)
    
    const response = await availabilityGet(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('date')
    expect(data).toHaveProperty('availableSlots')
    expect(Array.isArray(data.availableSlots)).toBe(true)
  })

  it('should handle different people counts', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().split('T')[0]
    
    const request = new Request(`http://localhost:3000/api/availability?date=${dateStr}&lang=fr&adults=4&children=2&babies=1`)
    
    const response = await availabilityGet(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.date).toBe(dateStr)
  })

  it('should handle different languages', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().split('T')[0]
    
    const languages = ['en', 'fr', 'de', 'es', 'it']
    
    for (const lang of languages) {
      const request = new Request(`http://localhost:3000/api/availability?date=${dateStr}&lang=${lang}&adults=2`)
      const response = await availabilityGet(request)
      expect(response.status).toBe(200)
    }
  })
})
