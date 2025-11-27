import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientEmployeesPage from './ClientPage'

export default async function EmployeesPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role

  if (!user) {
    redirect('/login')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    await createLog('UNAUTHORIZED_EMPLOYEES', `User ${user?.email || user?.id || 'unknown'} with role ${role} attempted /admin/employees`)
    redirect('/admin')
  }

  return <ClientEmployeesPage />
}