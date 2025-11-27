import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createLog } from '@/lib/logger'
import ClientPage from './ClientPage'

export default async function BlocksAdminPage() {
  const session = await auth()

  if (!session || !session.user) {
    return redirect('/login')
  }

  const role = (session.user as any).role
  const isAllowed = role === 'ADMIN' || role === 'SUPERADMIN'

  if (!isAllowed) {
    await createLog('UNAUTHORIZED_BLOCKS', {
      userId: session.user.id,
      email: session.user.email,
      role,
      path: '/admin/blocks'
    })
    return redirect('/admin')
  }

  return <ClientPage />
}
