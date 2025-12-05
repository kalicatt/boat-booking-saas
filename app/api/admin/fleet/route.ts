import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { BoatStatus, BookingStatus, MaintenanceType } from '@prisma/client'
import { log } from '@/lib/logger'
import { computeBatteryAlert, requiresMechanicalService } from '@/lib/maintenance'

export const runtime = 'nodejs'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']
const manifestResetRoles = new Set(['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'])

const releaseFutureBookings = async (boatId: number) => {
  const now = new Date()
  const affected = await prisma.booking.findMany({
    where: {
      boatId,
      startTime: { gte: now },
      status: { not: BookingStatus.CANCELLED }
    },
    select: { id: true }
  })

  if (!affected.length) {
    return { count: 0, bookingIds: [] as string[] }
  }

  await prisma.booking.updateMany({
    where: { id: { in: affected.map((booking) => booking.id) } },
    data: { boatId: null }
  })

  return { count: affected.length, bookingIds: affected.map((booking) => booking.id) }
}

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

type FleetUpdateAction = {
  action: 'update'
  boatId: number
  name?: string
  fleetLabel?: string | null
  manifest?: string | null
  lastChargeDate?: string
  batteryCycleDays?: number
  performedBy?: string
}

type FleetResetManifestAction = {
  action: 'resetManifest'
  boatId: number
  performedBy?: string
}

type FleetAction = FleetChargeAction | FleetIncidentAction | FleetUpdateAction | FleetResetManifestAction

const hasBoatId = (payload: unknown): payload is { boatId: number } =>
  typeof payload === 'object' && payload !== null && 'boatId' in payload && typeof (payload as { boatId: unknown }).boatId === 'number'

const isChargeAction = (payload: FleetAction | { action?: string } | null | undefined): payload is FleetChargeAction =>
  payload?.action === 'charge' && hasBoatId(payload)

const isIncidentAction = (payload: FleetAction | { action?: string } | null | undefined): payload is FleetIncidentAction =>
  payload?.action === 'incident' && hasBoatId(payload)

const isUpdateAction = (payload: FleetAction | { action?: string } | null | undefined): payload is FleetUpdateAction =>
  payload?.action === 'update' && hasBoatId(payload)

const isResetManifestAction = (payload: FleetAction | { action?: string } | null | undefined): payload is FleetResetManifestAction =>
  payload?.action === 'resetManifest' && hasBoatId(payload)

const ensureAdmin = async () => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, role }
}

export async function GET() {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error
  try {
    const boats = await prisma.boat.findMany({
      include: { maintenanceLogs: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { name: 'asc' }
    })
    const enriched = boats.map((boat) => {
      const { level, daysSinceCharge } = computeBatteryAlert(boat.lastChargeDate, boat.batteryCycleDays)
      const mechanicalAlert = requiresMechanicalService(boat.tripsSinceService)
      const preferredName = boat.fleetLabel?.trim().length ? boat.fleetLabel : boat.name
      return {
        id: boat.id,
        name: preferredName,
        planningName: boat.name,
        fleetLabel: boat.fleetLabel,
        status: boat.status,
        capacity: boat.capacity,
        batteryCycleDays: boat.batteryCycleDays,
        lastChargeDate: boat.lastChargeDate.toISOString(),
        batteryAlert: level,
        daysSinceCharge,
        totalTrips: boat.totalTrips,
        tripsSinceService: boat.tripsSinceService,
        hoursSinceService: boat.hoursSinceService,
        manifest: boat.manifest,
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
    return NextResponse.json({ generatedAt: new Date().toISOString(), stats, boats: enriched, viewerRole: role })
  } catch (err) {
    await log('error', 'Fleet snapshot failed', { route: '/api/admin/fleet', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Fleet snapshot failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { session, role, error } = await ensureAdmin()
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
      const releaseResult = await releaseFutureBookings(body.boatId)
      await log('warn', 'Incident recorded on boat', {
        route: '/api/admin/fleet',
        boatId: body.boatId,
        released: releaseResult.count
      })
      return NextResponse.json({
        status: 'ok',
        logId: logEntry.id,
        releaseCount: releaseResult.count,
        releasedBookingIds: releaseResult.bookingIds
      })
    } catch (err) {
      await log('error', 'Incident action failed', { route: '/api/admin/fleet', boatId: body.boatId, error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json({ error: 'Incident action failed' }, { status: 500 })
    }
  }

  if (isResetManifestAction(body)) {
    if (!role || !manifestResetRoles.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    try {
      const updatedBoat = await prisma.boat.update({ where: { id: body.boatId }, data: { manifest: null } })
      await log('info', 'Manifest reset', { route: '/api/admin/fleet', boatId: body.boatId })
      return NextResponse.json({ status: 'ok', boat: { id: updatedBoat.id } })
    } catch (err) {
      await log('error', 'Manifest reset failed', { route: '/api/admin/fleet', boatId: body.boatId, error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json({ error: 'Manifest reset failed' }, { status: 500 })
    }
  }

  if (isUpdateAction(body)) {
    try {
      const updateData: {
        name?: string
        fleetLabel?: string | null
        manifest?: string | null
        lastChargeDate?: Date
        batteryCycleDays?: number
      } = {}

      if (typeof body.name === 'string' && body.name.trim().length > 0) {
        updateData.name = body.name.trim()
      }

      if (body.fleetLabel !== undefined) {
        if (body.fleetLabel === null) {
          updateData.fleetLabel = null
        } else if (typeof body.fleetLabel === 'string') {
          const trimmedFleet = body.fleetLabel.trim()
          updateData.fleetLabel = trimmedFleet.length > 0 ? trimmedFleet : null
        }
      }

      if (body.manifest !== undefined) {
        if (body.manifest === null) {
          updateData.manifest = null
        } else if (typeof body.manifest === 'string') {
          const trimmed = body.manifest.trim()
          updateData.manifest = trimmed.length > 0 ? trimmed : null
        }
      }

      if (typeof body.batteryCycleDays === 'number') {
        const sanitizedCycle = Math.max(1, Math.min(14, Math.round(body.batteryCycleDays)))
        updateData.batteryCycleDays = sanitizedCycle
      }

      if (typeof body.lastChargeDate === 'string' && body.lastChargeDate.length > 0) {
        const parsed = new Date(body.lastChargeDate)
        if (!Number.isNaN(parsed.getTime())) {
          updateData.lastChargeDate = parsed
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No update payload provided' }, { status: 400 })
      }

      const updatedBoat = await prisma.boat.update({ where: { id: body.boatId }, data: updateData })
      await log('info', 'Boat updated', { route: '/api/admin/fleet', boatId: body.boatId })
      return NextResponse.json({ status: 'ok', boat: { id: updatedBoat.id } })
    } catch (err) {
      await log('error', 'Update action failed', { route: '/api/admin/fleet', boatId: body.boatId, error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json({ error: 'Update action failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
