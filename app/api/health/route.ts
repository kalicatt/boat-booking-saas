/**
 * API Route: GET /api/health
 * 
 * Health Check Endpoint - Vérifie la santé de l'application
 * Utilisé par:
 * - Load balancers (nginx, HAProxy)
 * - Kubernetes liveness/readiness probes
 * - Monitoring (Uptime Kuma, Prometheus)
 * - CI/CD post-deploy verification
 * 
 * Checks:
 * - Database (PostgreSQL)
 * - Redis cache
 * - MinIO storage
 * - External APIs (optionnel)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedisClient } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

type ServiceCheck = {
  status: HealthStatus
  latencyMs: number
  message?: string
  details?: Record<string, unknown>
}

type HealthResponse = {
  status: HealthStatus
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceCheck
    redis: ServiceCheck
    storage: ServiceCheck
  }
  checks: {
    total: number
    passed: number
    failed: number
  }
}

// Timeouts pour les checks (ms)
const TIMEOUT = {
  database: 5000,
  redis: 2000,
  storage: 5000
}

// Version de l'application (peut venir de package.json ou env)
const APP_VERSION = process.env.npm_package_version || '1.0.5'
const startTime = Date.now()

/**
 * SECURITY: Check if request is authorized for detailed health info (VUL-004)
 */
function isAuthorizedHealthRequest(request: Request): boolean {
  // Check API key
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.MONITORING_API_KEY && apiKey === process.env.MONITORING_API_KEY) {
    return true
  }
  
  // Check if request is from internal network (docker network, localhost)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || ''
  
  // Allow internal IPs
  const internalPatterns = ['127.0.0.1', '::1', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.']
  return internalPatterns.some(pattern => ip.startsWith(pattern))
}

/**
 * Check Database (PostgreSQL)
 */
async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now()
  
  try {
    // Simple query avec timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), TIMEOUT.database)
    )
    
    const queryPromise = prisma.$queryRaw`SELECT 1 as health`
    await Promise.race([queryPromise, timeoutPromise])
    
    // Vérifier le nombre de connexions (optionnel)
    const latency = Date.now() - start
    
    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latencyMs: latency,
      message: 'Database connected'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database check failed'
    }
  }
}

/**
 * Check Redis Cache
 */
async function checkRedis(): Promise<ServiceCheck> {
  const start = Date.now()
  
  try {
    const redis = getRedisClient()
    if (!redis) {
      return {
        status: 'degraded',
        latencyMs: 0,
        message: 'Redis not configured (using memory cache)'
      }
    }
    
    // Timeout pour Redis
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Redis timeout')), TIMEOUT.redis)
    )
    
    // PING Redis
    const pingPromise = redis.ping()
    const result = await Promise.race([pingPromise, timeoutPromise])
    
    const latency = Date.now() - start
    
    if (result === 'PONG') {
      return {
        status: latency < 50 ? 'healthy' : latency < 200 ? 'degraded' : 'unhealthy',
        latencyMs: latency,
        message: 'Redis connected'
      }
    }
    
    return {
      status: 'degraded',
      latencyMs: latency,
      message: `Unexpected Redis response: ${result}`
    }
  } catch (error) {
    return {
      status: 'degraded', // Degraded car fallback mémoire disponible
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Redis check failed'
    }
  }
}

/**
 * Check MinIO Storage
 */
async function checkStorage(): Promise<ServiceCheck> {
  const start = Date.now()
  
  const minioEndpoint = process.env.MINIO_ENDPOINT
  
  if (!minioEndpoint) {
    return {
      status: 'degraded',
      latencyMs: 0,
      message: 'MinIO not configured'
    }
  }

  try {
    // HTTP check du endpoint MinIO
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.storage)
    
    const response = await fetch(`${minioEndpoint}/minio/health/live`, {
      signal: controller.signal
    }).catch(() => null)
    
    clearTimeout(timeoutId)
    const latency = Date.now() - start
    
    if (response?.ok) {
      return {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latencyMs: latency,
        message: 'MinIO storage accessible'
      }
    }
    
    return {
      status: 'degraded',
      latencyMs: latency,
      message: `MinIO returned status ${response?.status || 'unknown'}`
    }
  } catch (error) {
    return {
      status: 'degraded',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Storage check failed'
    }
  }
}

/**
 * Calcule le statut global
 */
function calculateOverallStatus(services: HealthResponse['services']): HealthStatus {
  const statuses = Object.values(services).map(s => s.status)
  
  // Si la DB est down, le système est unhealthy
  if (services.database.status === 'unhealthy') {
    return 'unhealthy'
  }
  
  // Si un service est unhealthy (hors DB), le système est degraded
  if (statuses.includes('unhealthy')) {
    return 'degraded'
  }
  
  // Si tous sont healthy
  if (statuses.every(s => s === 'healthy')) {
    return 'healthy'
  }
  
  return 'degraded'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const verbose = searchParams.get('verbose') === 'true'
  
  // SECURITY: Check if authorized for detailed info (VUL-004)
  const isAuthorized = isAuthorizedHealthRequest(request)
  
  // For public requests, return minimal health status only
  if (!isAuthorized) {
    const database = await checkDatabase()
    return NextResponse.json({
      status: database.status === 'unhealthy' ? 'unhealthy' : 'operational'
    }, {
      status: database.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    })
  }
  
  // Exécuter tous les checks en parallèle
  const [database, redisCheck, storage] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage()
  ])
  
  const services = {
    database,
    redis: redisCheck,
    storage
  }
  
  const status = calculateOverallStatus(services)
  const checks = {
    total: 3,
    passed: Object.values(services).filter(s => s.status === 'healthy').length,
    failed: Object.values(services).filter(s => s.status === 'unhealthy').length
  }
  
  const response: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services,
    checks
  }
  
  // Si non verbose, simplifier la réponse
  if (!verbose) {
    return NextResponse.json({
      status: response.status,
      timestamp: response.timestamp,
      version: response.version
    }, {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Health-Status': status
      }
    })
  }
  
  return NextResponse.json(response, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Health-Status': status
    }
  })
}

// Endpoint HEAD pour checks rapides (load balancer)
export async function HEAD() {
  const database = await checkDatabase()
  
  return new NextResponse(null, {
    status: database.status === 'unhealthy' ? 503 : 200,
    headers: {
      'X-Health-Status': database.status,
      'X-Database-Latency': String(database.latencyMs)
    }
  })
}
