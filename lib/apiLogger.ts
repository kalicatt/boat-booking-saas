/**
 * API Route Logger Helper
 * 
 * Provides convenient logging functions for API routes with automatic route context.
 * Usage:
 *   import { apiLogger } from '@/lib/apiLogger'
 *   apiLogger.error('/api/bookings', error, { bookingId: 123 })
 */

import { logger } from './logger'

interface ApiContext {
  route?: string
  method?: string
  bookingId?: string | number
  userId?: string | number
  [key: string]: unknown
}

/**
 * API Logger with automatic route context
 */
export const apiLogger = {
  /**
   * Log an error in an API route
   */
  error(route: string, error: unknown, context?: ApiContext) {
    const ctx = {
      route,
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    }
    logger.error(ctx, `API error: ${route}`)
  },

  /**
   * Log a warning in an API route
   */
  warn(route: string, message: string, context?: ApiContext) {
    logger.warn({ route, ...context }, message)
  },

  /**
   * Log an info message in an API route
   */
  info(route: string, message: string, context?: ApiContext) {
    logger.info({ route, ...context }, message)
  },

  /**
   * Log a debug message in an API route
   */
  debug(route: string, message: string, context?: ApiContext) {
    logger.debug({ route, ...context }, message)
  },
}
