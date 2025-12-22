import client from 'prom-client'
import { getCacheMetrics } from '@/lib/cache'

type MetricsContext = {
  register: client.Registry
  rateLimitAllowed: client.Counter<'bucket'>
  rateLimitBlocked: client.Counter<'bucket'>
  httpRequestDuration: client.Histogram<'method' | 'route' | 'status'>
  httpRequestsTotal: client.Counter<'method' | 'route' | 'status'>
  bookingRevenue: client.Counter<'language'>
  bookingCount: client.Counter<'language'>
  bookingCancelled: client.Counter<'language'>
  bookingPeople: client.Counter<'language'>
  boatCapacity: client.Gauge<'boat'>
  cacheHits: client.Gauge
  cacheMisses: client.Gauge
  cacheErrors: client.Gauge
  cacheHitRate: client.Gauge
}

const globalMetrics = globalThis as typeof globalThis & {
  __snMetrics?: MetricsContext
}

function initMetrics(): MetricsContext {
  if (globalMetrics.__snMetrics) {
    return globalMetrics.__snMetrics
  }

  const register = new client.Registry()
  client.collectDefaultMetrics({ register })

  const rateLimitAllowed = new client.Counter<'bucket'>({
    name: 'rate_limiter_allowed_total',
    help: 'Total number of requests allowed by the rate limiter',
    labelNames: ['bucket'],
    registers: [register]
  })

  const rateLimitBlocked = new client.Counter<'bucket'>({
    name: 'rate_limiter_blocked_total',
    help: 'Total number of requests blocked by the rate limiter',
    labelNames: ['bucket'],
    registers: [register]
  })

  const httpRequestDuration = new client.Histogram<'method' | 'route' | 'status'>({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status'],
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
    registers: [register]
  })

  const httpRequestsTotal = new client.Counter<'method' | 'route' | 'status'>({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
  })

  const bookingRevenue = new client.Counter<'language'>({
    name: 'sweet_narcisse_booking_revenue_euros_total',
    help: 'Total booking revenue in euros',
    labelNames: ['language'],
    registers: [register]
  })

  const bookingCount = new client.Counter<'language'>({
    name: 'sweet_narcisse_booking_count_total',
    help: 'Total number of confirmed bookings',
    labelNames: ['language'],
    registers: [register]
  })

  const bookingCancelled = new client.Counter<'language'>({
    name: 'sweet_narcisse_booking_cancelled_total',
    help: 'Total number of cancelled bookings',
    labelNames: ['language'],
    registers: [register]
  })

  const bookingPeople = new client.Counter<'language'>({
    name: 'sweet_narcisse_booking_people_total',
    help: 'Total number of passengers',
    labelNames: ['language'],
    registers: [register]
  })

  const boatCapacity = new client.Gauge<'boat'>({
    name: 'sweet_narcisse_boat_capacity_total',
    help: 'Total boat capacity',
    labelNames: ['boat'],
    registers: [register]
  })

  const cacheHits = new client.Gauge({
    name: 'sweet_narcisse_cache_hits_total',
    help: 'Total number of cache hits',
    registers: [register]
  })

  const cacheMisses = new client.Gauge({
    name: 'sweet_narcisse_cache_misses_total',
    help: 'Total number of cache misses',
    registers: [register]
  })

  const cacheErrors = new client.Gauge({
    name: 'sweet_narcisse_cache_errors_total',
    help: 'Total number of cache errors',
    registers: [register]
  })

  const cacheHitRate = new client.Gauge({
    name: 'sweet_narcisse_cache_hit_rate_percent',
    help: 'Cache hit rate percentage',
    registers: [register]
  })

  globalMetrics.__snMetrics = {
    register,
    rateLimitAllowed,
    rateLimitBlocked,
    httpRequestDuration,
    httpRequestsTotal,
    bookingRevenue,
    bookingCount,
    bookingCancelled,
    bookingPeople,
    boatCapacity,
    cacheHits,
    cacheMisses,
    cacheErrors,
    cacheHitRate
  }

  return globalMetrics.__snMetrics
}

const {
  register,
  rateLimitAllowed,
  rateLimitBlocked,
  httpRequestDuration,
  httpRequestsTotal,
  bookingRevenue,
  bookingCount,
  bookingCancelled,
  bookingPeople,
  boatCapacity,
  cacheHits,
  cacheMisses,
  cacheErrors,
  cacheHitRate
} = initMetrics()

export function recordRateLimitEvent(bucket: string, allowed: boolean) {
  const label: Record<'bucket', string> = { bucket }
  if (allowed) {
    rateLimitAllowed.inc(label)
  } else {
    rateLimitBlocked.inc(label)
  }
}

export function recordHttpRequest(method: string, route: string, status: number, durationMs: number) {
  const labels = { method, route, status: status.toString() }
  httpRequestsTotal.inc(labels)
  httpRequestDuration.observe(labels, durationMs)
}

export function recordBooking(language: string, revenue: number, people: number) {
  const labels = { language }
  bookingCount.inc(labels)
  bookingRevenue.inc(labels, revenue)
  bookingPeople.inc(labels, people)
}

export function recordBookingCancellation(language: string) {
  bookingCancelled.inc({ language })
}

export function setBoatCapacity(boatName: string, capacity: number) {
  boatCapacity.set({ boat: boatName }, capacity)
}

export function updateCacheMetrics() {
  const metrics = getCacheMetrics()
  cacheHits.set(metrics.hits)
  cacheMisses.set(metrics.misses)
  cacheErrors.set(metrics.errors)
  const hitRate = parseFloat(metrics.hitRate.replace('%', ''))
  cacheHitRate.set(hitRate)
}

export async function serializeMetrics() {
  // Update cache metrics before serialization
  updateCacheMetrics()
  return register.metrics()
}

export { register }
