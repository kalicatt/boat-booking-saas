import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createConnectionToken, getTerminalLocation } from '@/lib/payments/stripeTerminal'

export const runtime = 'nodejs'

const AUTHORIZED_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

export async function POST(request: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role || 'GUEST'
  if (!AUTHORIZED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const deviceId = typeof payload?.deviceId === 'string' ? payload.deviceId : undefined
    const secret = await createConnectionToken()
    const locationId = getTerminalLocation() || null
    return NextResponse.json({ secret, deviceId: deviceId || null, locationId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection token error'
    console.error('[terminal/token]', message)
    return NextResponse.json({ error: 'Stripe terminal token error', details: message }, { status: 500 })
  }
}
