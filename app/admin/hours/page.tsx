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

  const canManage = role === 'ADMIN' || role === 'SUPERADMIN'
  const ownOnly = !canManage

  return <ClientHoursPage canManage={canManage} ownOnly={ownOnly} />
}