import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientPage from './ClientPage'

export default async function TodayPage() {
  const session = await auth()
  const user = session?.user as any

  if (!session || !session.user) {
    return redirect('/login')
  }

  const role = (session.user as any).role
  const isAllowed = role === 'ADMIN' || role === 'SUPERADMIN'

  if (!isAllowed) {
    await createLog(
      'UNAUTHORIZED_TODAY',
      `User ${user?.email || user?.id || 'unknown'} with role ${role} attempted /admin/today`
    )
    return redirect('/admin')
  }

  return <ClientPage />
}