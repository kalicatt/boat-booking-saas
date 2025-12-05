import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { log } from '@/lib/logger'
import { getAdminWeatherSnapshot } from '@/lib/weather'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']
export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await getAdminWeatherSnapshot()
    await log('info', 'Weather snapshot served', { route: '/api/admin/weather', role })
    return NextResponse.json(payload)
  } catch (error) {
    await log('error', 'Weather snapshot failed', {
      route: '/api/admin/weather',
      role,
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 500 })
  }
}
