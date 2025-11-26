// Simple in-memory rate limiter (non-distributed). For production on Vercel
// replace with Redis/Upstash. This resets on cold start and does NOT share state
// across regions. Suitable only as a soft shield.

type Bucket = { tokens: number; updated: number }
const buckets = new Map<string, Bucket>()

interface RateLimitOptions {
  key: string // unique key (ip:user:action)
  limit: number // max requests in window
  windowMs: number // window duration
  refillRatio?: number // optional fractional refill per ms (default all at once)
}

export function rateLimit(opts: RateLimitOptions) {
  const { key, limit, windowMs } = opts
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket) {
    buckets.set(key, { tokens: limit - 1, updated: now })
    return { allowed: true, remaining: limit - 1 }
  }
  const elapsed = now - bucket.updated
  if (elapsed >= windowMs) {
    bucket.tokens = limit - 1
    bucket.updated = now
    return { allowed: true, remaining: bucket.tokens }
  }
  if (bucket.tokens <= 0) {
    return { allowed: false, remaining: 0, retryAfter: windowMs - elapsed }
  }
  bucket.tokens -= 1
  return { allowed: true, remaining: bucket.tokens }
}

export function getClientIp(headers: Headers): string {
  const xf = headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}