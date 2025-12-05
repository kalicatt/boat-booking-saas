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

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: Request, context: RouteContext) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Slide inconnue.' }, { status: 400 })

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

    const payload = {
      title,
      subtitle,
      imageDesktop,
      imageMobile,
      isActive
    }

    const slide = await prisma.heroSlide.update({
      where: { id },
      data: {
        ...payload,
        draftPayload: payload
      }
    })

    await log('info', 'Hero slide updated', {
      route: `/api/admin/cms/hero/${id}`,
      role,
      slideId: slide.id
    })

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
    await log('error', 'Hero slide update failed', {
      route: `/api/admin/cms/hero/${id}`,
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de mettre à jour la slide.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Slide inconnue.' }, { status: 400 })

  try {
    await prisma.heroSlide.delete({ where: { id } })
    await log('info', 'Hero slide deleted', {
      route: `/api/admin/cms/hero/${id}`,
      role,
      slideId: id
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    await log('error', 'Hero slide delete failed', {
      route: `/api/admin/cms/hero/${id}`,
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de supprimer la slide.' }, { status: 500 })
  }
}
