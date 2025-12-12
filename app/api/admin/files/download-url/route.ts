import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createDownloadUrl } from '@/lib/storage'
import { EmployeeDocumentDownloadSchema } from '@/lib/validation'
import { createLog } from '@/lib/logger'
import { ensureDocumentAdminAccess } from '../_access'

export async function POST(req: Request) {
  const access = await ensureDocumentAdminAccess()
  if ('error' in access) return access.error

  try {
    const payload = await req.json()
    const parsed = EmployeeDocumentDownloadSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }

    const { documentId } = parsed.data
    const document = await prisma.employeeDocument.findUnique({ where: { id: documentId } })

    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    if (document.status === 'PENDING') {
      return NextResponse.json({ error: 'Document non confirmé' }, { status: 409 })
    }

    const signed = await createDownloadUrl({ key: document.storageKey })

    await createLog('EMPLOYEE_DOC_DOWNLOAD', `Téléchargement document ${document.id} par ${access.user.id ?? 'inconnu'}`)

    return NextResponse.json({
      downloadUrl: signed.url,
      expiresIn: signed.expiresIn,
      document: {
        id: document.id,
        userId: document.userId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        status: document.status,
        version: document.version,
        archivedAt: document.archivedAt
      }
    })
  } catch (error) {
    console.error('POST /api/admin/files/download-url', error)
    return NextResponse.json({ error: 'Erreur génération URL de téléchargement' }, { status: 500 })
  }
}
