import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resolveAdminPermissions, hasPageAccess } from '@/types/adminPermissions'

export type AdminDocumentSessionUser = {
  id?: string | null
  role?: string | null
  adminPermissions?: unknown
  isActive?: boolean | null
}

type AccessSuccess = {
  user: AdminDocumentSessionUser
  role: string
}

type AccessResult = AccessSuccess | { error: NextResponse }

const allowedRoles = new Set(['SUPERADMIN', 'ADMIN'])

export async function ensureDocumentAdminAccess(): Promise<AccessResult> {
  const session = await auth()
  const user = (session?.user ?? null) as AdminDocumentSessionUser | null
  const role = typeof user?.role === 'string' ? user.role : null
  const permissions = resolveAdminPermissions(user?.adminPermissions)

  const hasPermission =
    !!role &&
    (allowedRoles.has(role) || (role === 'EMPLOYEE' && hasPageAccess(permissions, 'employees')))

  if (!user || !hasPermission || !role || user.isActive === false) {
    return { error: NextResponse.json({ error: '⛔ Accès refusé.' }, { status: 403 }) }
  }

  return { user, role }
}
