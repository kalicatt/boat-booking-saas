import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

// Country calling codes used by the booking widget autocomplete.
// We generate them from libphonenumber-js to avoid maintaining a partial manual list.
export interface PhoneCodeEntry {
  code: string
  country: string
  iso2: string
}

export const PHONE_CODES: PhoneCodeEntry[] = (() => {
  const byCode = new Map<string, PhoneCodeEntry>()
  for (const iso2 of getCountries()) {
    const calling = getCountryCallingCode(iso2)
    const code = `+${calling}`
    // Many countries share the same calling code (e.g. +1). We keep one entry per code.
    if (!byCode.has(code)) {
      byCode.set(code, { code, country: iso2, iso2 })
    }
  }

  return Array.from(byCode.values()).sort((a, b) => {
    const an = Number(a.code.replace('+', ''))
    const bn = Number(b.code.replace('+', ''))
    if (an !== bn) return an - bn
    return a.iso2.localeCompare(b.iso2)
  })
})()
