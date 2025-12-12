import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resolveAdminPermissions, hasPermission, type AdminPermissions } from '@/types/adminPermissions'

export type EmployeeManagerContext = {
  userId: string
  role: string
  permissions: AdminPermissions
}

export type EmployeeManagerAccessResult = EmployeeManagerContext | { error: NextResponse }

const normalizeRole = (role: string | null | undefined) => {
  if (!role) return null
  return role === 'SUPER_ADMIN' ? 'SUPERADMIN' : role
}

export async function ensureEmployeeManagerAccess(): Promise<EmployeeManagerAccessResult> {
  const session = await auth()
  const sessionUser = session?.user ?? null

  const userId = typeof sessionUser?.id === 'string' ? sessionUser.id : null
  const normalizedRole = normalizeRole(typeof sessionUser?.role === 'string' ? sessionUser.role : null)
  const permissions = resolveAdminPermissions(sessionUser?.adminPermissions)

  if (!userId || !normalizedRole) {
    return { error: NextResponse.json({ error: '⛔ Accès refusé.' }, { status: 403 }) }
  }

  const allowed =
    normalizedRole === 'SUPERADMIN' ||
    (normalizedRole === 'ADMIN' &&
      (hasPermission(permissions, 'employees', 'edit') || hasPermission(permissions, 'employees', 'delete')))

  if (!allowed) {
    return { error: NextResponse.json({ error: '⛔ Accès refusé.' }, { status: 403 }) }
  }

  return { userId, role: normalizedRole, permissions }
}
