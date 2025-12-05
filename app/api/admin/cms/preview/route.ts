import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCmsPreviewPayload } from '@/lib/cms/preview'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']

const ensureAdmin = async () => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function GET() {
  const { session, error } = await ensureAdmin()
  if (!session) return error

  const payload = await getCmsPreviewPayload()
  return NextResponse.json({ generatedAt: new Date().toISOString(), ...payload })
}
