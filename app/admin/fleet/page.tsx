import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import FleetClientPage from './FleetClientPage'

type AdminSessionUser = {
  id?: string | null
  email?: string | null
  role?: string | null
}

const isAdminRole = (role: string | null | undefined) =>
  role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

export default async function FleetPage() {
  const session = await auth()
  const user = (session?.user ?? null) as AdminSessionUser | null

  if (!user || typeof user.id !== 'string') {
    redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null

  if (!isAdminRole(role)) {
    const identifier = user.email ?? user.id ?? 'unknown'
    await createLog(
      'UNAUTHORIZED_FLEET',
      `User ${identifier} with role ${role ?? 'unknown'} attempted /admin/fleet`
    )
    redirect('/admin')
  }

  return <FleetClientPage />
}
