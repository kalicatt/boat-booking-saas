import { createHmac } from 'crypto'

const DEFAULT_SECRET = 'changeme'

export function computeBookingToken(bookingId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || DEFAULT_SECRET
  return createHmac('sha256', secret).update(bookingId).digest('hex').slice(0, 16)
}

export function verifyBookingToken(bookingId: string, token: string | null | undefined): boolean {
  if (!token) return false
  return computeBookingToken(bookingId) === token
}
