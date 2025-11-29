import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ClientHoursPage from './ClientPage'

type SessionUser = {
  id?: string | null
  role?: string | null
}

export default async function HoursPage() {
  const session = await auth()
  const user = (session?.user ?? null) as SessionUser | null

  if (!user || typeof user.id !== 'string') {
    redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null
  const canManage = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'
  const ownOnly = !canManage

  return <ClientHoursPage canManage={canManage} ownOnly={ownOnly} />
}