import client from 'prom-client'

type MetricsContext = {
  register: client.Registry
  rateLimitAllowed: client.Counter<'bucket'>
  rateLimitBlocked: client.Counter<'bucket'>
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

  globalMetrics.__snMetrics = {
    register,
    rateLimitAllowed,
    rateLimitBlocked
  }

  return globalMetrics.__snMetrics
}

const { register, rateLimitAllowed, rateLimitBlocked } = initMetrics()

export function recordRateLimitEvent(bucket: string, allowed: boolean) {
  const label: Record<'bucket', string> = { bucket }
  if (allowed) {
    rateLimitAllowed.inc(label)
  } else {
    rateLimitBlocked.inc(label)
  }
}

export async function serializeMetrics() {
  return register.metrics()
}

export { register }
