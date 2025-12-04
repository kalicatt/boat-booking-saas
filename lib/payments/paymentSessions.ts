import { addMinutes } from 'date-fns'
import { prisma } from '@/lib/prisma'
import type { PaymentSessionStatus, Prisma } from '@prisma/client'

const SESSION_TTL_MINUTES = 7

export type CreateSessionInput = {
  bookingId: string
  amount: number
  currency?: string
  provider?: string
  createdById?: string | null
  methodType?: string
  targetDeviceId?: string | null
  metadata?: Prisma.InputJsonValue
}

export async function createPaymentSession(input: CreateSessionInput) {
  const expiresAt = addMinutes(new Date(), SESSION_TTL_MINUTES)
  return prisma.paymentSession.create({
    data: {
      bookingId: input.bookingId,
      amount: input.amount,
      currency: (input.currency || 'EUR').toUpperCase(),
      provider: input.provider || 'stripe_terminal',
      methodType: input.methodType || 'card',
      targetDeviceId: input.targetDeviceId || null,
      createdById: input.createdById || null,
      metadata: input.metadata ?? undefined,
      expiresAt
    }
  })
}

export async function getSession(sessionId: string) {
  return prisma.paymentSession.findUnique({ where: { id: sessionId } })
}

export async function updateSessionStatus(sessionId: string, status: PaymentSessionStatus, data: Prisma.PaymentSessionUpdateInput = {}) {
  return prisma.paymentSession.update({
    where: { id: sessionId },
    data: { status, ...data }
  })
}

export async function expireStaleSessions(reference = new Date()) {
  return prisma.paymentSession.updateMany({
    where: {
      status: { in: ['PENDING', 'CLAIMED', 'PROCESSING'] },
      expiresAt: { lte: reference }
    },
    data: { status: 'EXPIRED' }
  })
}

export async function claimNextSession(deviceId: string) {
  const now = new Date()
  const session = await prisma.$transaction(async (tx) => {
    const candidate = await tx.paymentSession.findFirst({
      where: {
        status: 'PENDING',
        expiresAt: { gt: now },
        OR: [
          { targetDeviceId: null },
          { targetDeviceId: deviceId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    })
    if (!candidate) return null
    const updated = await tx.paymentSession.update({
      where: { id: candidate.id },
      data: {
        status: 'CLAIMED',
        claimedByDeviceId: deviceId,
        claimedAt: now,
        processingAt: now
      }
    })
    return updated
  })
  return session
}

export async function attachIntentToSession({ sessionId, intentId, clientSecret }: { sessionId: string; intentId: string; clientSecret: string }) {
  return prisma.paymentSession.update({
    where: { id: sessionId },
    data: {
      intentId,
      intentClientSecret: clientSecret
    }
  })
}

export async function completeSessionSuccess(sessionId: string) {
  return prisma.paymentSession.update({
    where: { id: sessionId },
    data: {
      status: 'SUCCEEDED',
      completedAt: new Date()
    }
  })
}

export async function failSession(sessionId: string, message: string) {
  return prisma.paymentSession.update({
    where: { id: sessionId },
    data: {
      status: 'FAILED',
      lastError: message,
      completedAt: new Date()
    }
  })
}
