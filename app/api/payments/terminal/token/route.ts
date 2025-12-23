import { NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobileAuth'
import { createConnectionToken, getTerminalLocation } from '@/lib/payments/stripeTerminal'

export const runtime = 'nodejs'

const AUTHORIZED_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

export async function POST(request: Request) {
  // Utiliser getMobileUser qui supporte à la fois le token Bearer et la session NextAuth
  const user = await getMobileUser(request)
  const role = user?.role || 'GUEST'
  
  if (!user || !AUTHORIZED_ROLES.includes(role)) {
    console.log('[terminal/token] Unauthorized access attempt, role:', role)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const deviceId = typeof payload?.deviceId === 'string' ? payload.deviceId : undefined
    const secret = await createConnectionToken()
    const locationId = getTerminalLocation() || null
    console.log('[terminal/token] Token created for', user.email, 'device:', deviceId)
    return NextResponse.json({ secret, deviceId: deviceId || null, locationId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection token error'
    console.error('[terminal/token]', message)
    return NextResponse.json({ error: 'Stripe terminal token error', details: message }, { status: 500 })
  }
}
