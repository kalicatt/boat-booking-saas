import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'
import { EmployeeArchiveRequestSchema } from '@/lib/validation'
import { ensureEmployeeManagerAccess } from '../../_access'

const allowedRoles = new Set(['EMPLOYEE', 'ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'])

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await ensureEmployeeManagerAccess()
  if ('error' in access) return access.error

  const { id: targetId } = await context.params
  if (!targetId) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const body = await safeJson(req)
  const parsed = EmployeeArchiveRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
  }

  const employee = await prisma.user.findUnique({ where: { id: targetId } })
  if (!employee || !allowedRoles.has(employee.role)) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })
  }

  if (employee.role === 'SUPERADMIN') {
    return NextResponse.json({ error: 'Impossible de désactiver le propriétaire.' }, { status: 403 })
  }

  const employmentEndDate = parsed.data.employmentEndDate
    ? new Date(parsed.data.employmentEndDate)
    : new Date()

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      isActive: false,
      employmentEndDate,
      archiveReason: parsed.data.reason ?? employee.archiveReason ?? null,
      sessionVersion: { increment: 1 }
    }
  })

  const { password: _password, ...safeUser } = updated
  void _password
  await createLog(
    'EMPLOYEE_ARCHIVE',
    `Archivage ${safeUser.firstName} ${safeUser.lastName} (${safeUser.email})${parsed.data.reason ? ` – ${parsed.data.reason}` : ''}`
  )

  return NextResponse.json({ success: true, user: safeUser })
}

async function safeJson(req: NextRequest) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}
