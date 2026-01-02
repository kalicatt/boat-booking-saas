import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { log } from '@/lib/logger'
import type { HeroSlideDraftPayload, PartnerDraftData } from '@/types/cms'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']

const ensureAdmin = async () => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, role, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, role }
}

const isHeroDraftPayload = (value: unknown): value is HeroSlideDraftPayload => {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    typeof payload.imageDesktop === 'string' &&
    typeof payload.title === 'object' &&
    typeof payload.subtitle === 'object'
  )
}

const isPartnerDraft = (value: unknown): value is PartnerDraftData => {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return typeof payload.name === 'string' && typeof payload.logoUrl === 'string'
}

export async function POST() {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  try {
    const siteEntries = await prisma.siteConfig.findMany({ select: { key: true, draftValues: true } })
    const heroDrafts = await prisma.heroSlide.findMany({
      select: { id: true, draftPayload: true },
      where: { draftPayload: { not: Prisma.DbNull } }
    })
    const partnerDrafts = await prisma.partner.findMany({
      select: { id: true, draftData: true },
      where: { draftData: { not: Prisma.DbNull } }
    })

    const operations: Prisma.PrismaPromise<unknown>[] = []

    siteEntries.forEach((entry) => {
      if (!entry.draftValues) return
      operations.push(
        prisma.siteConfig.update({
          where: { key: entry.key },
          data: {
            publishedValues: entry.draftValues
          }
        })
      )
    })

    heroDrafts.forEach((slide) => {
      if (!isHeroDraftPayload(slide.draftPayload)) return
      const payload = slide.draftPayload
      operations.push(
        prisma.heroSlide.update({
          where: { id: slide.id },
          data: {
            title: payload.title,
            subtitle: payload.subtitle,
            imageDesktop: payload.imageDesktop,
            imageMobile: payload.imageMobile,
            isActive: payload.isActive,
              draftPayload: Prisma.DbNull
          }
        })
      )
    })

    partnerDrafts.forEach((partner) => {
      if (!isPartnerDraft(partner.draftData)) return
      const payload = partner.draftData
      operations.push(
        prisma.partner.update({
          where: { id: partner.id },
          data: {
            name: payload.name,
            logoUrl: payload.logoUrl,
            websiteUrl: payload.websiteUrl ?? null,
            isVisible: typeof payload.isVisible === 'boolean' ? payload.isVisible : true,
            order: typeof payload.order === 'number' ? payload.order : undefined,
              draftData: Prisma.DbNull
          }
        })
      )
    })

    if (operations.length) {
      await prisma.$transaction(operations)
    }

    // Compatible with Next.js versions where revalidateTag signature differs
    ;(revalidateTag as unknown as (...args: unknown[]) => unknown)('cms:published', 'max')

    await log('info', 'CMS publish triggered', {
      route: '/api/admin/cms/publish',
      role,
      totalOperations: operations.length
    })

    return NextResponse.json({ success: true, operations: operations.length })
  } catch (err) {
    await log('error', 'CMS publish failed', {
      route: '/api/admin/cms/publish',
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible de publier les contenus.' }, { status: 500 })
  }
}
