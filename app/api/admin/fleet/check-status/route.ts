import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'
import { BoatStatus } from '@prisma/client'
import {
  computeBatteryAlert,
  MECHANICAL_TRIPS_THRESHOLD,
  requiresMechanicalService
} from '@/lib/maintenance'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']
const maintenanceKey = process.env.MAINTENANCE_FLEET_SECRET

const ensureAuthorized = async (req: Request) => {
  if (maintenanceKey) {
    const provided = req.headers.get('x-maintenance-key')
    if (provided && provided === maintenanceKey) {
      return { actor: 'maintenance-script' }
    }
  }
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  const actor = session.user?.email || session.user?.name || 'admin'
  return { actor }
}

export async function POST(req: Request) {
  const { actor, error } = await ensureAuthorized(req)
  if (!actor) return error

  try {
    const boats = await prisma.boat.findMany({ orderBy: { name: 'asc' } })
    const snapshot = boats.map((boat) => {
      const batteryAlert = computeBatteryAlert(boat.lastChargeDate, boat.batteryCycleDays)
      const mechanicalAlert = requiresMechanicalService(boat.tripsSinceService)
      return {
        id: boat.id,
        name: boat.name,
        status: boat.status,
        batteryAlert: batteryAlert.level,
        daysSinceCharge: batteryAlert.daysSinceCharge,
        tripsSinceService: boat.tripsSinceService,
        batteryCycleDays: boat.batteryCycleDays,
        mechanicalAlert
      }
    })

    const critical = snapshot.filter((boat) => boat.batteryAlert === 'CRITICAL')
    const warning = snapshot.filter((boat) => boat.batteryAlert === 'WARNING')
    const mechanical = snapshot.filter((boat) => boat.mechanicalAlert)
    const maintenance = snapshot.filter((boat) => boat.status === BoatStatus.MAINTENANCE)

    const result = {
      generatedAt: new Date().toISOString(),
      requestedBy: actor,
      totals: {
        fleet: snapshot.length,
        critical: critical.length,
        warning: warning.length,
        mechanical: mechanical.length,
        unavailable: maintenance.length
      },
      thresholds: {
        mechanicalTrips: MECHANICAL_TRIPS_THRESHOLD
      },
      sections: {
        critical,
        upcoming: warning,
        mechanical,
        maintenance
      }
    }

    await log('info', 'Fleet check-status generated', { critical: critical.length, warning: warning.length })
    return NextResponse.json(result)
  } catch (err) {
    await log('error', 'Fleet check-status failed', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Fleet report failed' }, { status: 500 })
  }
}
