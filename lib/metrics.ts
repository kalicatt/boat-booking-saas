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
  // Cost monitoring metrics
  bandwidthBytes: client.Counter<'direction' | 'type'>
  storageBytes: client.Gauge<'bucket'>
  apiCallsExternal: client.Counter<'provider' | 'endpoint'>
  emailsSent: client.Counter<'type'>
  dbQueriesTotal: client.Counter<'operation'>
  dbQueryDuration: client.Histogram<'operation'>
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

  // Cost monitoring metrics
  const bandwidthBytes = new client.Counter<'direction' | 'type'>({
    name: 'sweet_narcisse_bandwidth_bytes_total',
    help: 'Total bandwidth usage in bytes',
    labelNames: ['direction', 'type'], // direction: ingress/egress, type: api/static/upload
    registers: [register]
  })

  const storageBytes = new client.Gauge<'bucket'>({
    name: 'sweet_narcisse_storage_bytes',
    help: 'Current storage usage in bytes per bucket',
    labelNames: ['bucket'], // minio bucket name
    registers: [register]
  })

  const apiCallsExternal = new client.Counter<'provider' | 'endpoint'>({
    name: 'sweet_narcisse_external_api_calls_total',
    help: 'Total external API calls',
    labelNames: ['provider', 'endpoint'], // provider: stripe/paypal/openweather/smtp
    registers: [register]
  })

  const emailsSent = new client.Counter<'type'>({
    name: 'sweet_narcisse_emails_sent_total',
    help: 'Total emails sent by type',
    labelNames: ['type'], // type: confirmation/reminder/review/contact
    registers: [register]
  })

  const dbQueriesTotal = new client.Counter<'operation'>({
    name: 'sweet_narcisse_db_queries_total',
    help: 'Total database queries by operation',
    labelNames: ['operation'], // operation: select/insert/update/delete
    registers: [register]
  })

  const dbQueryDuration = new client.Histogram<'operation'>({
    name: 'sweet_narcisse_db_query_duration_ms',
    help: 'Database query duration in ms',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
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
    cacheHitRate,
    bandwidthBytes,
    storageBytes,
    apiCallsExternal,
    emailsSent,
    dbQueriesTotal,
    dbQueryDuration
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
  cacheHitRate,
  bandwidthBytes,
  storageBytes,
  apiCallsExternal,
  emailsSent,
  dbQueriesTotal,
  dbQueryDuration
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

// Cost monitoring functions
export function recordBandwidth(direction: 'ingress' | 'egress', type: 'api' | 'static' | 'upload', bytes: number) {
  bandwidthBytes.inc({ direction, type }, bytes)
}

export function setStorageUsage(bucket: string, bytes: number) {
  storageBytes.set({ bucket }, bytes)
}

export function recordExternalApiCall(provider: 'stripe' | 'paypal' | 'openweather' | 'smtp' | 'recaptcha', endpoint: string) {
  apiCallsExternal.inc({ provider, endpoint })
}

export function recordEmailSent(type: 'confirmation' | 'reminder' | 'review' | 'contact' | 'cancellation') {
  emailsSent.inc({ type })
}

export function recordDbQuery(operation: 'select' | 'insert' | 'update' | 'delete', durationMs: number) {
  dbQueriesTotal.inc({ operation })
  dbQueryDuration.observe({ operation }, durationMs)
}

export async function serializeMetrics() {
  // Update cache metrics before serialization
  updateCacheMetrics()
  return register.metrics()
}

export { register }
