import { createHmac } from 'crypto'

const DEFAULT_SECRET = 'changeme'

export function computeBookingToken(bookingId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || DEFAULT_SECRET
  const token = createHmac('sha256', secret).update(bookingId).digest('hex').slice(0, 16)
  console.log('[booking-token] computeBookingToken:', { bookingId: bookingId.substring(0, 8) + '...', token, secretUsed: secret.substring(0, 8) + '...' })
  return token
}

export function verifyBookingToken(bookingId: string, token: string | null | undefined): boolean {
  if (!token) {
    console.log('[booking-token] verifyBookingToken: no token provided')
    return false
  }
  const expected = computeBookingToken(bookingId)
  const valid = expected === token
  console.log('[booking-token] verifyBookingToken:', { token, expected, valid })
  return valid
}
