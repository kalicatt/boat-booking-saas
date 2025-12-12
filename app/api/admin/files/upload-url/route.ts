import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { buildEmployeeDocumentKey, createUploadUrl } from '@/lib/storage'
import { cleanString, stripScriptTags, EmployeeDocumentUploadSchema } from '@/lib/validation'
import { createLog } from '@/lib/logger'
import { ensureDocumentAdminAccess } from '../_access'

const employeeRoles = new Set(['EMPLOYEE', 'ADMIN', 'SUPERADMIN'])

const sanitizeFileName = (value: string) => {
  const cleaned = stripScriptTags(cleanString(value, 180) ?? value) ?? ''
  const safe = cleaned.replace(/[\\/:*?"<>|]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe || 'document'
}

export async function POST(req: Request) {
  const access = await ensureDocumentAdminAccess()
  if ('error' in access) return access.error

  try {
    const body = await req.json()
    const parsed = EmployeeDocumentUploadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }

    const { userId, category, fileName, mimeType, size, checksum, expiresAt } = parsed.data

    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    })

    if (!employee || !employeeRoles.has(employee.role)) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })
    }

    const documentId = randomUUID()
    const normalizedFileName = sanitizeFileName(fileName)
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null
    const storageKey = buildEmployeeDocumentKey(userId, documentId, normalizedFileName)

    const document = await prisma.$transaction(async (tx) => {
      const aggregate = await tx.employeeDocument.aggregate({
        _max: { version: true },
        where: { userId, category }
      })
      const nextVersion = (aggregate._max.version ?? 0) + 1

      return tx.employeeDocument.create({
        data: {
          id: documentId,
          userId,
          uploadedById: access.user.id ?? undefined,
          category,
          fileName: normalizedFileName,
          mimeType,
          size,
          storageKey,
          version: nextVersion,
          status: 'PENDING',
          expiresAt: expiresAtDate ?? undefined
        }
      })
    })

    const signed = await createUploadUrl({ key: document.storageKey, contentType: mimeType, checksumSha256: checksum })

    await createLog('EMPLOYEE_DOC_UPLOAD_URL', `Préparation document ${document.id} pour utilisateur ${document.userId}`)

    return NextResponse.json({
      uploadUrl: signed.url,
      expiresIn: signed.expiresIn,
      document: {
        id: document.id,
        userId: document.userId,
        fileName: document.fileName,
        version: document.version,
        status: document.status,
        storageKey: document.storageKey
      }
    })
  } catch (error) {
    console.error('POST /api/admin/files/upload-url', error)
    return NextResponse.json({ error: 'Erreur génération URL' }, { status: 500 })
  }
}
