import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmployeeDocumentArchiveSchema } from '@/lib/validation'
import { createLog } from '@/lib/logger'
import { ensureDocumentAdminAccess } from '../_access'

export async function POST(req: Request) {
  const access = await ensureDocumentAdminAccess()
  if ('error' in access) return access.error

  try {
    const payload = await req.json()
    const parsed = EmployeeDocumentArchiveSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }

    const { documentId, reason } = parsed.data
    const existing = await prisma.employeeDocument.findUnique({ where: { id: documentId } })

    if (!existing) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    if (existing.status === 'ARCHIVED') {
      return NextResponse.json({ document: existing, archived: true })
    }

    const document = await prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archivedById: access.user.id ?? undefined
      }
    })

    await createLog(
      'EMPLOYEE_DOC_ARCHIVE',
      `Archivage document ${document.id} pour utilisateur ${document.userId}${reason ? ` (${reason})` : ''}`
    )

    return NextResponse.json({ document, archived: true })
  } catch (error) {
    console.error('POST /api/admin/files/archive', error)
    return NextResponse.json({ error: "Erreur d'archivage" }, { status: 500 })
  }
}
