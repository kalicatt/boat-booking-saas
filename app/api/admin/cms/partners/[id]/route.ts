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

type RouteContext = { params: Promise<{ id: string }> }

const sanitizeWebsite = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export async function PUT(req: Request, context: RouteContext) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Partenaire inconnu.' }, { status: 400 })

  try {
    const body = (await req.json()) as Record<string, unknown>
    const rawName = typeof body.name === 'string' ? body.name.trim() : ''
    const rawLogo = typeof body.logoUrl === 'string' ? body.logoUrl.trim() : ''
    const websiteUrl = sanitizeWebsite(body.websiteUrl)
    const isVisible = typeof body.isVisible === 'boolean' ? body.isVisible : true
    const order = typeof body.order === 'number' ? body.order : undefined

    if (!rawName.length) {
      return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
    }

    if (!rawLogo.length) {
      return NextResponse.json({ error: 'Le logo est obligatoire.' }, { status: 400 })
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name: rawName,
        logoUrl: rawLogo,
        websiteUrl,
        isVisible,
        order,
        draftData: {
          name: rawName,
          logoUrl: rawLogo,
          websiteUrl,
          isVisible,
          order
        }
      }
    })

    await log('info', 'Partner updated', { route: `/api/admin/cms/partners/${id}`, role, partnerId: id })

    return NextResponse.json({ partner })
  } catch (err) {
    await log('error', 'Partner update failed', {
      route: `/api/admin/cms/partners/${id}`,
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de mettre à jour le partenaire.' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Partenaire inconnu.' }, { status: 400 })

  try {
    const body = (await req.json()) as Record<string, unknown>
    const data: Record<string, unknown> = {}

    if (typeof body.isVisible === 'boolean') {
      data.isVisible = body.isVisible
    }

    if (typeof body.order === 'number') {
      data.order = body.order
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: 'Aucune modification fournie.' }, { status: 400 })
    }

    const partner = await prisma.partner.update({
      where: { id },
      data
    })

    await log('info', 'Partner patched', { route: `/api/admin/cms/partners/${id}`, role, partnerId: id })

    return NextResponse.json({ partner })
  } catch (err) {
    await log('error', 'Partner patch failed', {
      route: `/api/admin/cms/partners/${id}`,
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de mettre à jour le partenaire.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Partenaire inconnu.' }, { status: 400 })

  try {
    await prisma.partner.delete({ where: { id } })
    await log('info', 'Partner deleted', { route: `/api/admin/cms/partners/${id}`, role, partnerId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    await log('error', 'Partner delete failed', {
      route: `/api/admin/cms/partners/${id}`,
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de supprimer le partenaire.' }, { status: 500 })
  }
}
