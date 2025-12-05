import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']

const ensureAdmin = async () => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, role, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, role }
}

export async function PUT(req: Request) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  try {
    const body = (await req.json()) as Record<string, unknown>
    const ids = Array.isArray(body.ids) ? (body.ids.filter((value): value is string => typeof value === 'string')) : []

    if (!ids.length) {
      return NextResponse.json({ error: 'Ordre invalide.' }, { status: 400 })
    }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.heroSlide.update({
          where: { id },
          data: { order: index }
        })
      )
    )

    await log('info', 'Hero slides reordered', {
      route: '/api/admin/cms/hero/reorder',
      role,
      total: ids.length
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    await log('error', 'Hero slides reorder failed', {
      route: '/api/admin/cms/hero/reorder',
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de mettre à jour l\'ordre.' }, { status: 500 })
  }
}
