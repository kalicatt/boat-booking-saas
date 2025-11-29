import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ClientEmployeesPage from './ClientPage'

type AdminEmployeeUser = {
  role?: string | null
}

export default async function EmployeesPage() {
  const session = await auth()
  const user = (session?.user ?? null) as AdminEmployeeUser | null
  const role = typeof user?.role === 'string' ? user.role : null

  if (!user) {
    redirect('/login')
  }

  // Allow EMPLOYEE to access in read-only mode
  const canManage = role === 'ADMIN' || role === 'SUPERADMIN'

  return <ClientEmployeesPage canManage={canManage} />
}