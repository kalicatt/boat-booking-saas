import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientPage from './ClientPage'

type AdminTodayUser = {
  role?: string | null
  email?: string | null
  id?: string | null
}

export default async function TodayPage() {
  const session = await auth()
  const user = (session?.user ?? null) as AdminTodayUser | null

  if (!user) {
    return redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null
  const isAllowed = role === 'ADMIN' || role === 'SUPERADMIN'

  if (!isAllowed) {
    await createLog(
      'UNAUTHORIZED_TODAY',
      `User ${user.email || user.id || 'unknown'} with role ${role ?? 'unknown'} attempted /admin/today`
    )
    return redirect('/admin')
  }

  return <ClientPage />
}