import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

// Accept local digits (already stripped to numbers). Return E.164 combining country code + cleaned local part.
export function localToE164(countryCode: string, localDigits: string): string {
  const digits = (localDigits || '').replace(/[^0-9]/g,'')
  if (!digits) return ''
  // Remove single leading trunk zero if present
  const stripped = digits.replace(/^0(\d{6,14})$/, '$1')
  return countryCode + stripped
}

// Accepts either a national number (to be combined with the selected country calling code)
// or an already-international number (starting with + or 00). Returns an E.164 string.
export function inputToE164(countryCode: string, input: string): string {
  const raw = (input || '').trim()
  if (!raw) return ''

  // If user pasted an international number, validate/normalize it directly.
  const compact = raw.replace(/[\s\u00A0\-().]/g, '')
  const asInternational = compact.startsWith('+')
    ? compact
    : compact.startsWith('00')
      ? `+${compact.slice(2)}`
      : null

  if (asInternational) {
    const pn = parsePhoneNumberFromString(asInternational)
    return pn ? pn.number : asInternational
  }

  // Otherwise treat it as a national number under the selected calling code.
  const e164 = localToE164(countryCode, raw)
  const pn = parsePhoneNumberFromString(e164)
  return pn ? pn.number : e164
}

export function isPossibleLocalDigits(localDigits: string): boolean {
  const d = (localDigits || '').replace(/[^0-9]/g,'')
  return d.length >= 6 && d.length <= 14
}

export function isValidE164(e164: string): boolean {
  if (!e164) return false
  const pn = parsePhoneNumberFromString(e164)
  return !!pn && pn.isValid()
}

export function formatInternational(e164: string): string {
  const pn = parsePhoneNumberFromString(e164)
  return pn && pn.isValid() ? pn.formatInternational() : e164
}

export function normalizeIncoming(e164: string): string {
  if (!e164) return e164
  const pn = parsePhoneNumberFromString(e164)
  return pn && pn.isValid() ? pn.number : e164
}
