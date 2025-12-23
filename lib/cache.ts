/**
 * Unified cache layer with Redis backend and in-memory fallback
 * 
 * Features:
 * - Redis primary cache with automatic fallback to in-memory
 * - Configurable TTL per operation
 * - Pattern-based invalidation
 * - Metrics for cache hit/miss rates
 * - Automatic serialization/deserialization
 */
import { logger } from '@/lib/logger'

import { getRedisClient } from '@/lib/redis'

// In-memory fallback cache
type CacheEntry = { value: unknown; expiresAt: number }
const memoryCache = new Map<string, CacheEntry>()

// Cache configuration
export const CACHE_TTL = {
  AVAILABILITY: 60, // 1 minute (frequently updated)
  BOATS: 300, // 5 minutes (rarely changes)
  HOURS: 3600, // 1 hour (changes daily at most)
  BOOKINGS: 30, // 30 seconds (frequently updated)
  WEATHER: 600, // 10 minutes (external API)
  CMS: 300, // 5 minutes (admin updates occasionally)
  STATS: 60, // 1 minute (dashboard data)
} as const

// Cache metrics (in-memory counters)
const metrics = {
  hits: 0,
  misses: 0,
  errors: 0,
}

/**
 * Get value from cache (Redis primary, memory fallback)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient()
    
    if (redis) {
      // Try Redis first
      const value = await redis.get<T>(key)
      if (value !== null) {
        metrics.hits++
        return value
      }
    }

    // Fallback to memory cache
    const entry = memoryCache.get(key)
    if (entry && Date.now() < entry.expiresAt) {
      metrics.hits++
      return entry.value as T
    }

    // Clean up expired entry
    if (entry) {
      memoryCache.delete(key)
    }

    metrics.misses++
    return null
  } catch (error) {
    metrics.errors++
    logger.error({ error, key, operation: 'GET' }, 'Cache GET error')
    
    // Try memory cache on Redis error
    const entry = memoryCache.get(key)
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value as T
    }
    
    return null
  }
}

/**
 * Set value in cache with TTL (seconds)
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
  try {
    const redis = getRedisClient()
    
    if (redis) {
      // Store in Redis with TTL
      await redis.setex(key, ttlSeconds, value)
    }

    // Always store in memory cache as backup
    const expiresAt = Date.now() + ttlSeconds * 1000
    memoryCache.set(key, { value, expiresAt })
  } catch (error) {
    metrics.errors++
    console.error('[cache] SET error:', error)
    
    // Still save to memory cache
    const expiresAt = Date.now() + ttlSeconds * 1000
    memoryCache.set(key, { value, expiresAt })
  }
}

/**
 * Delete specific key from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    const redis = getRedisClient()
    if (redis) {
      await redis.del(key)
    }
    memoryCache.delete(key)
  } catch (error) {
    metrics.errors++
    console.error('[cache] DELETE error:', error)
    memoryCache.delete(key) // Still delete from memory
  }
}

/**
 * Delete all keys matching a pattern (e.g., "availability:*")
 * Invalidates both Redis and memory cache
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const prefix = pattern.replace('*', '')
    
    // Invalidate Redis keys matching the pattern
    const redis = getRedisClient()
    if (redis) {
      try {
        // Use SCAN to find and delete matching keys
        let cursor: number | string = 0
        let hasMore = true
        while (hasMore) {
          const result: [string | number, string[]] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 })
          cursor = result[0]
          const keys = result[1]
          if (keys.length > 0) {
            await Promise.all(keys.map(key => redis.del(key)))
          }
          hasMore = cursor !== 0 && cursor !== '0'
        }
      } catch (redisError) {
        console.error('[cache] Redis SCAN/DELETE error:', redisError)
      }
    }
    
    // Also invalidate memory cache
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key)
      }
    }
  } catch (error) {
    metrics.errors++
    console.error('[cache] INVALIDATE error:', error)
  }
}

/**
 * Invalidate all caches for a specific date (bookings, availability)
 */
export async function cacheInvalidateDate(date: string): Promise<void> {
  await cacheInvalidatePattern(`availability:${date}:`)
  await cacheInvalidatePattern(`bookings:${date}:`)
}

/**
 * Get cache metrics
 */
export function getCacheMetrics() {
  const total = metrics.hits + metrics.misses
  const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0
  
  return {
    hits: metrics.hits,
    misses: metrics.misses,
    errors: metrics.errors,
    hitRate: hitRate.toFixed(2) + '%',
    total,
  }
}

/**
 * Reset cache metrics (useful for testing)
 */
export function resetCacheMetrics(): void {
  metrics.hits = 0
  metrics.misses = 0
  metrics.errors = 0
}

/**
 * Wrapper for cached function calls
 * 
 * Example:
 * ```ts
 * const boats = await withCache(
 *   'boats:active',
 *   () => prisma.boat.findMany({ where: { status: 'ACTIVE' } }),
 *   CACHE_TTL.BOATS
 * )
 * ```
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }

  // Cache miss - fetch data
  const data = await fetchFn()
  
  // Store in cache
  await cacheSet(key, data, ttlSeconds)
  
  return data
}
