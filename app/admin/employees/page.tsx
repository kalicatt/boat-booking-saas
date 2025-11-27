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

  // Allow EMPLOYEE to access in read-only mode
  const canManage = role === 'ADMIN' || role === 'SUPERADMIN'

  return <ClientEmployeesPage canManage={canManage} />
}