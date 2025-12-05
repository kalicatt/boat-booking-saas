import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'
import { normalizeTranslationRecord } from '@/types/cms'

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
    const title = normalizeTranslationRecord(body.title)
    const subtitle = normalizeTranslationRecord(body.subtitle)
    const rawDesktop = typeof body.imageDesktop === 'string' ? body.imageDesktop.trim() : ''
    const rawMobile = typeof body.imageMobile === 'string' ? body.imageMobile.trim() : ''
    const imageDesktop = rawDesktop
    const imageMobile = rawMobile.length ? rawMobile : null
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true

    if (!imageDesktop.length) {
      return NextResponse.json({ error: 'L\'image desktop est obligatoire.' }, { status: 400 })
    }

    if (!Object.keys(title).length) {
      return NextResponse.json({ error: 'Au moins une traduction de titre est requise.' }, { status: 400 })
    }

    const orderAggregate = await prisma.heroSlide.aggregate({ _max: { order: true } })
    const nextOrder = (orderAggregate._max.order ?? 0) + 1

    const payload = {
      title,
      subtitle,
      imageDesktop,
      imageMobile,
      isActive
    }

    const slide = await prisma.heroSlide.create({
      data: {
        ...payload,
        order: nextOrder,
        draftPayload: payload
      }
    })

    await log('info', 'Hero slide created', { route: '/api/admin/cms/hero', role, slideId: slide.id })

    return NextResponse.json({
      slide: {
        id: slide.id,
        imageDesktop: slide.imageDesktop,
        imageMobile: slide.imageMobile,
        isActive: slide.isActive,
        order: slide.order,
        title,
        subtitle
      }
    })
  } catch (err) {
    await log('error', 'Hero slide creation failed', {
      route: '/api/admin/cms/hero',
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de créer la slide.' }, { status: 500 })
  }
}
