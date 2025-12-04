import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { BoatStatus, MaintenanceType } from '@prisma/client'
import { log } from '@/lib/logger'
import { computeBatteryAlert, requiresMechanicalService } from '@/lib/maintenance'

export const runtime = 'nodejs'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']

type FleetChargeAction = {
  action: 'charge'
  boatId: number
  notes?: string
  performedBy?: string
}

type FleetIncidentAction = {
  action: 'incident'
  boatId: number
  description?: string
  performedBy?: string
}

type FleetAction = FleetChargeAction | FleetIncidentAction

const isChargeAction = (payload: FleetAction | { action?: string } | null | undefined): payload is FleetChargeAction =>
  payload?.action === 'charge' && typeof payload.boatId === 'number'

const isIncidentAction = (payload: FleetAction | { action?: string } | null | undefined): payload is FleetIncidentAction =>
  payload?.action === 'incident' && typeof payload.boatId === 'number'

const ensureAdmin = async () => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function GET() {
  const { session, error } = await ensureAdmin()
  if (!session) return error
  try {
    const boats = await prisma.boat.findMany({
      include: { maintenanceLogs: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { name: 'asc' }
    })
    const enriched = boats.map((boat) => {
      const { level, daysSinceCharge } = computeBatteryAlert(boat.lastChargeDate, boat.batteryCycleDays)
      const mechanicalAlert = requiresMechanicalService(boat.tripsSinceService)
      return {
        id: boat.id,
        name: boat.name,
        status: boat.status,
        capacity: boat.capacity,
        batteryCycleDays: boat.batteryCycleDays,
        lastChargeDate: boat.lastChargeDate.toISOString(),
        batteryAlert: level,
        daysSinceCharge,
        totalTrips: boat.totalTrips,
        tripsSinceService: boat.tripsSinceService,
        hoursSinceService: boat.hoursSinceService,
        mechanicalAlert,
        maintenanceLogs: boat.maintenanceLogs.map((entry) => ({
          id: entry.id,
          type: entry.type,
          description: entry.description,
          performedBy: entry.performedBy,
          cost: entry.cost,
          createdAt: entry.createdAt.toISOString()
        }))
      }
    })
    const stats = {
      total: enriched.length,
      criticalBatteries: enriched.filter((boat) => boat.batteryAlert === 'CRITICAL').length,
      warningBatteries: enriched.filter((boat) => boat.batteryAlert === 'WARNING').length,
      maintenance: enriched.filter((boat) => boat.status === BoatStatus.MAINTENANCE).length,
      mechanicalAlerts: enriched.filter((boat) => boat.mechanicalAlert).length
    }
    await log('info', 'Fleet snapshot generated', { route: '/api/admin/fleet' })
    return NextResponse.json({ generatedAt: new Date().toISOString(), stats, boats: enriched })
  } catch (err) {
    await log('error', 'Fleet snapshot failed', { route: '/api/admin/fleet', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Fleet snapshot failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { session, error } = await ensureAdmin()
  if (!session) return error
  const body = (await req.json()) as FleetAction | { action?: string }
  const performedBy = (body as FleetAction)?.performedBy || session.user?.name || session.user?.email || 'Fleet Bot'

  if (isChargeAction(body)) {
    try {
      const now = new Date()
      const [, logEntry] = await prisma.$transaction([
        prisma.boat.update({ where: { id: body.boatId }, data: { lastChargeDate: now } }),
        prisma.maintenanceLog.create({
          data: {
            boatId: body.boatId,
            type: MaintenanceType.CHARGE,
            description: body.notes ?? 'Charge enregistrée',
            performedBy
          }
        })
      ])
      await log('info', 'Boat marked as charged', { route: '/api/admin/fleet', boatId: body.boatId })
      return NextResponse.json({ status: 'ok', logId: logEntry.id })
    } catch (err) {
      await log('error', 'Charge action failed', { route: '/api/admin/fleet', boatId: body.boatId, error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json({ error: 'Charge action failed' }, { status: 500 })
    }
  }

  if (isIncidentAction(body)) {
    try {
      const [, logEntry] = await prisma.$transaction([
        prisma.boat.update({ where: { id: body.boatId }, data: { status: BoatStatus.MAINTENANCE } }),
        prisma.maintenanceLog.create({
          data: {
            boatId: body.boatId,
            type: MaintenanceType.REPAIR,
            description: body.description ?? 'Incident signalé',
            performedBy
          }
        })
      ])
      await log('warn', 'Incident recorded on boat', { route: '/api/admin/fleet', boatId: body.boatId })
      return NextResponse.json({ status: 'ok', logId: logEntry.id })
    } catch (err) {
      await log('error', 'Incident action failed', { route: '/api/admin/fleet', boatId: body.boatId, error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json({ error: 'Incident action failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
