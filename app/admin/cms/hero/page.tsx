import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'
import { HeroManagerClient } from './HeroManagerClient'
import type { HeroSlideDTO } from '@/types/cms'
import { normalizeTranslationRecord } from '@/types/cms'

const isAdminRole = (role: string | null | undefined) =>
  role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

export default async function HeroManagerPage() {
  const session = await auth()
  const user = session?.user ?? null

  if (!user || typeof user.id !== 'string') {
    redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null

  if (!isAdminRole(role)) {
    const identifier = user.email ?? user.id ?? 'unknown'
    await createLog(
      'UNAUTHORIZED_CMS_HERO',
      `User ${identifier} with role ${role ?? 'unknown'} attempted /admin/cms/hero`
    )
    redirect('/admin')
  }

  const slidesRaw = await prisma.heroSlide.findMany({ orderBy: { order: 'asc' } })
  const slides: HeroSlideDTO[] = slidesRaw.map((slide) => ({
    id: slide.id,
    imageDesktop: slide.imageDesktop,
    imageMobile: slide.imageMobile ?? null,
    isActive: slide.isActive,
    order: slide.order,
    title: normalizeTranslationRecord(slide.title),
    subtitle: normalizeTranslationRecord(slide.subtitle)
  }))

  return <HeroManagerClient initialSlides={slides} />
}
