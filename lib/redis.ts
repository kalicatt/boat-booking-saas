import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null

function resolveRedisEnv() {
  const url = process.env.RATE_LIMIT_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.RATE_LIMIT_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return null
  }
  return { url, token }
}

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient
  const credentials = resolveRedisEnv()
  if (!credentials) return null
  redisClient = new Redis({ url: credentials.url, token: credentials.token })
  return redisClient
}
