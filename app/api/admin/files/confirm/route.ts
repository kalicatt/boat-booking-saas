import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmployeeDocumentConfirmSchema } from '@/lib/validation'
import { createLog } from '@/lib/logger'
import { ensureDocumentAdminAccess } from '../_access'

export async function POST(req: Request) {
  const access = await ensureDocumentAdminAccess()
  if ('error' in access) return access.error

  try {
    const payload = await req.json()
    const parsed = EmployeeDocumentConfirmSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }

    const { documentId } = parsed.data
    const existing = await prisma.employeeDocument.findUnique({ where: { id: documentId } })

    if (!existing) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    if (existing.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Document archivé' }, { status: 409 })
    }

    const document = await prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        status: 'ACTIVE',
        uploadedAt: new Date(),
        uploadedById: access.user.id ?? existing.uploadedById ?? undefined
      }
    })

    await createLog('EMPLOYEE_DOC_CONFIRMED', `Document ${document.id} confirmé pour utilisateur ${document.userId}`)

    return NextResponse.json({ document })
  } catch (error) {
    console.error('POST /api/admin/files/confirm', error)
    return NextResponse.json({ error: 'Erreur confirmation' }, { status: 500 })
  }
}
