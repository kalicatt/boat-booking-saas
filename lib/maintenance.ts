import type { BoatStatus } from '@prisma/client'

const MILLISECONDS_IN_DAY = 86_400_000
export const DEFAULT_BATTERY_CYCLE = 4
export const MECHANICAL_TRIPS_THRESHOLD = 500

export type BatteryAlertLevel = 'OK' | 'WARNING' | 'CRITICAL'

export type BatteryAlert = {
  level: BatteryAlertLevel
  daysSinceCharge: number
}

export const computeBatteryAlert = (
  lastChargeDate: Date,
  batteryCycleDays: number | null | undefined
): BatteryAlert => {
  const cycle = Math.max(1, batteryCycleDays ?? DEFAULT_BATTERY_CYCLE)
  const diff = Date.now() - lastChargeDate.getTime()
  const daysSinceCharge = Math.max(0, Math.floor(diff / MILLISECONDS_IN_DAY))
  if (daysSinceCharge >= cycle) {
    return { level: 'CRITICAL', daysSinceCharge }
  }
  if (daysSinceCharge === Math.max(0, cycle - 1)) {
    return { level: 'WARNING', daysSinceCharge }
  }
  return { level: 'OK', daysSinceCharge }
}

export const calculateRideDurationHours = (
  startTime: Date,
  endTime: Date,
  fallbackMinutes = 30
) => {
  const diffMs = endTime.getTime() - startTime.getTime()
  const diffHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0
  if (diffHours > 0) return diffHours
  return Math.max(fallbackMinutes, 1) / 60
}

export const isBoatUnavailable = (
  status: BoatStatus,
  batteryAlert: BatteryAlertLevel
) => status === 'MAINTENANCE' || batteryAlert === 'CRITICAL'

export const requiresMechanicalService = (
  tripsSinceService: number,
  threshold: number = MECHANICAL_TRIPS_THRESHOLD
) => tripsSinceService >= threshold
