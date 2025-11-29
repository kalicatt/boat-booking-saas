import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientPage from './ClientPage'

type AdminSessionUser = {
  id?: string | null
  email?: string | null
  role?: string | null
}

export default async function BlocksAdminPage() {
  const session = await auth()
  const user = (session?.user ?? null) as AdminSessionUser | null

  if (!session || !session.user) {
    return redirect('/login')
  }

  const role = typeof session.user.role === 'string' ? session.user.role : null
  const isAllowed = role === 'ADMIN' || role === 'SUPERADMIN'

  if (!isAllowed) {
    await createLog(
      'UNAUTHORIZED_BLOCKS',
      `User ${user?.email || user?.id || 'unknown'} with role ${role} attempted /admin/blocks`
    )
    return redirect('/admin')
  }

  return <ClientPage />
}
