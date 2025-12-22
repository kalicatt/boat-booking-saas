import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import pino from 'pino'

type Level = 'info'|'warn'|'error'|'debug'|'fatal'

interface LogCtx {
  route?: string
  bookingId?: string | number
  boatId?: string | number
  partnerId?: string | number
  slideId?: string
  role?: string
  filename?: string
  error?: string | Error
  [key: string]: unknown
}

// Configuration Pino
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_env: process.env.NODE_ENV,
      }
    },
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  // En développement, utiliser pino-pretty pour un affichage plus lisible
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
})

// Logger singleton exporté
export const logger = pinoLogger

export async function createLog(action: string, details: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return
    await prisma.log.create({ data: { action, details, userId } })
  } catch (error) {
    pinoLogger.error({ error, action: 'createLog' }, 'Failed to create database log')
  }
}

export async function log(level: Level, message: string, ctx?: LogCtx){
  // Convertir Error en objet sérialisable
  const context = ctx ? { ...ctx } : {}
  if (context.error instanceof Error) {
    context.error = {
      name: context.error.name,
      message: context.error.message,
      stack: context.error.stack,
    }
  }

  // Logger avec Pino
  pinoLogger[level](context, message)

  // Créer également un log en base de données pour l'audit
  try {
    await createLog(`${level.toUpperCase()}: ${message}`, JSON.stringify(context))
  } catch (error) {
    // Ne pas bloquer si la création du log DB échoue
    pinoLogger.debug({ error }, 'Failed to create audit log in database')
  }
}

// Fonctions de commodité pour chaque niveau de log
export const logInfo = (message: string, ctx?: LogCtx) => log('info', message, ctx)
export const logWarn = (message: string, ctx?: LogCtx) => log('warn', message, ctx)
export const logError = (message: string, ctx?: LogCtx) => log('error', message, ctx)
export const logDebug = (message: string, ctx?: LogCtx) => log('debug', message, ctx)
export const logFatal = (message: string, ctx?: LogCtx) => log('fatal', message, ctx)