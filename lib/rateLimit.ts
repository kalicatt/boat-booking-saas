import { getRedisClient } from './redis'
import { recordRateLimitEvent } from './metrics'
import { logger } from './logger'

type Bucket = { tokens: number; updated: number }
const memoryBuckets = new Map<string, Bucket>()

interface RateLimitOptions {
  key: string // unique key (ip:user:action)
  limit: number // max requests in window
  windowMs: number // window duration
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfter?: number
}

const LUA_TOKEN_BUCKET = `
local tokens_key = KEYS[1]
local ts_key = KEYS[2]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local refill_rate = tonumber(ARGV[4])

local tokens = tonumber(redis.call("GET", tokens_key))
local timestamp = tonumber(redis.call("GET", ts_key))

if tokens == nil then
  tokens = capacity
end
if timestamp == nil then
  timestamp = now
end

local elapsed = now - timestamp
if elapsed > 0 then
  local refill = elapsed * refill_rate
  if refill > 0 then
    tokens = math.min(capacity, tokens + refill)
    timestamp = now
  end
end

local allowed = 0
if tokens >= 1 then
  allowed = 1
  tokens = tokens - 1
end

redis.call("SET", tokens_key, tokens, "PX", window * 2)
redis.call("SET", ts_key, timestamp, "PX", window * 2)

local retry_after = 0
if allowed == 0 then
  local needed = 1 - tokens
  if needed > 0 and refill_rate > 0 then
    retry_after = math.ceil(needed / refill_rate)
  end
end

return {allowed, tokens, retry_after}
`

async function memoryRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowMs } = opts
  const now = Date.now()
  const bucket = memoryBuckets.get(key)
  if (!bucket) {
    memoryBuckets.set(key, { tokens: limit - 1, updated: now })
    recordRateLimitEvent(key, true)
    return { allowed: true, remaining: limit - 1 }
  }
  const elapsed = now - bucket.updated
  if (elapsed >= windowMs) {
    bucket.tokens = limit - 1
    bucket.updated = now
    recordRateLimitEvent(key, true)
    return { allowed: true, remaining: bucket.tokens }
  }
  if (bucket.tokens <= 0) {
    recordRateLimitEvent(key, false)
    return { allowed: false, remaining: 0, retryAfter: Math.max(0, windowMs - elapsed) }
  }
  bucket.tokens -= 1
  recordRateLimitEvent(key, true)
  return { allowed: true, remaining: bucket.tokens }
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const redis = getRedisClient()
  if (!redis) {
    return memoryRateLimit(opts)
  }

  const keyBase = `rate:${opts.key}`
  const tokensKey = `${keyBase}:tokens`
  const timestampKey = `${keyBase}:ts`
  const now = Date.now()
  const refillRate = opts.limit / opts.windowMs

  try {
    const result = await redis.eval(
      LUA_TOKEN_BUCKET,
      [tokensKey, timestampKey],
      [now, opts.windowMs, opts.limit, refillRate]
    ) as [number | string, number | string, number | string] | null

    const allowed = Array.isArray(result) ? Number(result[0]) === 1 : false
    const tokens = Array.isArray(result) ? Number(result[1] ?? 0) : 0
    const retryAfterRaw = Array.isArray(result) ? Number(result[2] ?? 0) : 0

    recordRateLimitEvent(opts.key, allowed)

    return {
      allowed,
      remaining: Math.max(0, Math.floor(tokens)),
      retryAfter: allowed ? undefined : Math.max(0, Math.ceil(retryAfterRaw))
    }
  } catch (error) {
    logger.error({ error, key: opts.key }, 'Rate limit redis fallback to memory')
    return memoryRateLimit(opts)
  }
}

export function getClientIp(headers: Headers): string {
  const xf = headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

/**
 * SECURITY: Generate a client fingerprint for improved rate limiting (VUL-006)
 * Combines multiple signals to make rate limiting harder to bypass
 */
export function getClientFingerprint(headers: Headers): string {
  const ip = getClientIp(headers)
  const userAgent = headers.get('user-agent') || 'unknown'
  const acceptLang = headers.get('accept-language') || ''
  const accept = headers.get('accept') || ''
  
  // Create a simple hash from combined signals
  // This makes it harder to bypass rate limiting with just IP rotation
  const combined = `${ip}:${userAgent.slice(0, 50)}:${acceptLang.slice(0, 20)}:${accept.slice(0, 30)}`
  
  // Simple hash function for fingerprinting
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return `${ip}:${Math.abs(hash).toString(36)}`
}

/**
 * SECURITY: Enhanced rate limiting with combined IP + fingerprint (VUL-006)
 * Falls back to IP-only if fingerprint rate limit passes
 */
export async function enhancedRateLimit(opts: RateLimitOptions & { headers: Headers }): Promise<RateLimitResult> {
  const { headers, ...baseOpts } = opts
  const fingerprint = getClientFingerprint(headers)
  const ip = getClientIp(headers)
  
  // Check fingerprint-based rate limit first (stricter)
  const fingerprintResult = await rateLimit({
    ...baseOpts,
    key: `${baseOpts.key}:fp:${fingerprint}`
  })
  
  if (!fingerprintResult.allowed) {
    return fingerprintResult
  }
  
  // Also check IP-based rate limit (to catch distributed attacks from same IP range)
  const ipResult = await rateLimit({
    ...baseOpts,
    key: `${baseOpts.key}:ip:${ip}`,
    limit: baseOpts.limit * 2 // Allow more per IP since fingerprints differ
  })
  
  return ipResult
}