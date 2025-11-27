import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientHoursPage from './ClientPage'

export default async function HoursPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role

  if (!user) {
    redirect('/login')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    await createLog(
      'UNAUTHORIZED_HOURS',
      `User ${user?.email || user?.id || 'unknown'} with role ${role} attempted /admin/hours`
    )
    redirect('/admin')
  }

  return <ClientHoursPage />
}