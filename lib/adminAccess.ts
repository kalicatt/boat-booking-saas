import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'
import {
  resolveAdminPermissions,
  hasPageAccess,
  hasPermission,
  type AdminPermissionKey,
  type AdminPermissionAction,
  type AdminPermissions
} from '@/types/adminPermissions'

export type AdminSessionUser = {
  id?: string | null
  email?: string | null
  role?: string | null
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  adminPermissions?: AdminPermissions | null
  image?: string | null
  isActive?: boolean | null
}

export type AdminAccessContext = {
  user: AdminSessionUser
  role: string | null
  permissions: AdminPermissions
}

const privilegedRoles = new Set(['SUPERADMIN', 'ADMIN'])

export const isPrivilegedRole = (role: string | null | undefined): boolean =>
  !!role && privilegedRoles.has(role)

export async function getAdminAccessContext(): Promise<AdminAccessContext> {
  const session = await auth()
  const user = (session?.user ?? null) as AdminSessionUser | null

  if (!user) {
    redirect('/login')
  }

  if (user.isActive === false) {
    redirect('/admin/account-disabled')
  }

  const role = typeof user.role === 'string' ? user.role : null
  const permissions = resolveAdminPermissions(user.adminPermissions)

  return { user, role, permissions }
}

export function canAccessAdminPage<K extends AdminPermissionKey>(
  role: string | null,
  permissions: AdminPermissions,
  page: K
): boolean {
  if (isPrivilegedRole(role)) {
    return true
  }
  return hasPageAccess(permissions, page)
}

export function canPerformAdminAction<K extends AdminPermissionKey>(
  role: string | null,
  permissions: AdminPermissions,
  page: K,
  action?: AdminPermissionAction<K>
): boolean {
  if (isPrivilegedRole(role)) {
    return true
  }
  if (!action) {
    return hasPageAccess(permissions, page)
  }
  return hasPermission(permissions, page, action)
}

export type EnsureAdminAccessOptions<K extends AdminPermissionKey> = {
  page: K
  action?: AdminPermissionAction<K>
  redirectTo?: string
  auditEvent?: string
  auditContext?: string
}

export async function ensureAdminPageAccess<K extends AdminPermissionKey>(
  options: EnsureAdminAccessOptions<K>
): Promise<AdminAccessContext> {
  const { page, action, redirectTo = '/admin', auditEvent, auditContext } = options
  const context = await getAdminAccessContext()
  const allowed = action
    ? canPerformAdminAction(context.role, context.permissions, page, action)
    : canAccessAdminPage(context.role, context.permissions, page)

  if (!allowed) {
    if (auditEvent) {
      const identifier = context.user.email ?? context.user.id ?? 'unknown'
      await createLog(auditEvent, auditContext ?? `User ${identifier} blocked on ${page}`)
    }
    redirect(redirectTo)
  }

  return context
}
