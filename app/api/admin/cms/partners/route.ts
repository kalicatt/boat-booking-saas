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

export async function POST(req: Request) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  try {
    const body = (await req.json()) as Record<string, unknown>
    const rawName = typeof body.name === 'string' ? body.name.trim() : ''
    const rawLogo = typeof body.logoUrl === 'string' ? body.logoUrl.trim() : ''
    const rawWebsite = typeof body.websiteUrl === 'string' ? body.websiteUrl.trim() : ''
    const isVisible = typeof body.isVisible === 'boolean' ? body.isVisible : true

    if (!rawName.length) {
      return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
    }

    if (!rawLogo.length) {
      return NextResponse.json({ error: 'Le logo est obligatoire.' }, { status: 400 })
    }

    const orderAggregate = await prisma.partner.aggregate({ _max: { order: true } })
    const nextOrder = (orderAggregate._max.order ?? 0) + 1

    const partner = await prisma.partner.create({
      data: {
        name: rawName,
        logoUrl: rawLogo,
        websiteUrl: rawWebsite.length ? rawWebsite : null,
        isVisible,
        order: nextOrder,
        draftData: {
          name: rawName,
          logoUrl: rawLogo,
          websiteUrl: rawWebsite.length ? rawWebsite : null,
          isVisible
        }
      }
    })

    await log('info', 'Partner created', { route: '/api/admin/cms/partners', role, partnerId: partner.id })

    return NextResponse.json({ partner })
  } catch (err) {
    await log('error', 'Partner creation failed', {
      route: '/api/admin/cms/partners',
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de créer le partenaire.' }, { status: 500 })
  }
}
