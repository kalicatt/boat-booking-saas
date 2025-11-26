import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

// Accept local digits (already stripped to numbers). Return E.164 combining country code + cleaned local part.
export function localToE164(countryCode: string, localDigits: string): string {
  const digits = (localDigits || '').replace(/[^0-9]/g,'')
  if (!digits) return ''
  // Remove single leading trunk zero if present
  const stripped = digits.replace(/^0(\d{6,14})$/, '$1')
  return countryCode + stripped
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
