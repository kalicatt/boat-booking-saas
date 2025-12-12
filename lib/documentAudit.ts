import type { EmployeeDocumentAction } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export type DocumentAuditContext = {
  ipAddress?: string | null
  userAgent?: string | null
}

export type DocumentAuditPayload = {
  documentId: string
  action: EmployeeDocumentAction
  actorId?: string | null
  targetUserId?: string | null
  details?: string | null
} & DocumentAuditContext

const safeHeader = (headers: Headers | undefined, key: string) => headers?.get(key) ?? null

export function extractRequestContext(request?: Request | NextRequest | { headers?: Headers } | null): DocumentAuditContext {
  if (!request) return {}
  const headers = 'headers' in request ? request.headers : undefined
  if (!headers) return {}
  const forwarded = safeHeader(headers, 'x-forwarded-for')
  const ipAddress = forwarded?.split(',')[0]?.trim() || safeHeader(headers, 'x-real-ip') || null
  const userAgent = safeHeader(headers, 'user-agent')
  return { ipAddress, userAgent }
}

export async function logDocumentAction(payload: DocumentAuditPayload): Promise<void> {
  try {
    await prisma.employeeDocumentLog.create({
      data: {
        documentId: payload.documentId,
        action: payload.action,
        actorId: payload.actorId ?? undefined,
        targetUserId: payload.targetUserId ?? undefined,
        ipAddress: payload.ipAddress ?? undefined,
        userAgent: payload.userAgent ?? undefined,
        details: payload.details ?? undefined
      }
    })
  } catch (error) {
    console.error('Document audit log failed', error)
  }
}
