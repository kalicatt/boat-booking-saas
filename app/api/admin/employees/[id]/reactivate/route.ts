import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'
import { EmployeeReactivateRequestSchema } from '@/lib/validation'
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
  const parsed = EmployeeReactivateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
  }

  const employee = await prisma.user.findUnique({ where: { id: targetId } })
  if (!employee || !allowedRoles.has(employee.role)) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      isActive: true,
      employmentEndDate: null,
      archiveReason: null,
      sessionVersion: { increment: 1 }
    }
  })

  const { password: _password, ...safeUser } = updated
  void _password
  await createLog(
    'EMPLOYEE_REACTIVATE',
    `Réactivation ${safeUser.firstName} ${safeUser.lastName} (${safeUser.email})${parsed.data.note ? ` – ${parsed.data.note}` : ''}`
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
