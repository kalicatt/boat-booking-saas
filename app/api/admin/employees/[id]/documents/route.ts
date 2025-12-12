import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureEmployeeManagerAccess } from '../../_access'

function sanitizeId(value: string | string[] | undefined) {
  if (!value || typeof value !== 'string') return null
  return value
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await ensureEmployeeManagerAccess()
  if ('error' in access) return access.error

  const { id } = await context.params
  const userId = sanitizeId(id)
  if (!userId) {
    return NextResponse.json({ error: 'ID employé manquant' }, { status: 400 })
  }

  const documents = await prisma.employeeDocument.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      archivedBy: { select: { id: true, firstName: true, lastName: true } }
    }
  })

  return NextResponse.json(
    documents.map((doc) => ({
      id: doc.id,
      userId: doc.userId,
      category: doc.category,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      storageKey: doc.storageKey,
      version: doc.version,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      archivedAt: doc.archivedAt,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      uploadedBy: doc.uploadedBy,
      archivedBy: doc.archivedBy
    }))
  )
}
