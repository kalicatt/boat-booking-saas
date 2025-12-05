import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'
import type { PartnerDTO } from '@/types/cms'
import { PartnersManagerClient } from './PartnersManagerClient'

const isAdminRole = (role: string | null | undefined) =>
  role === 'ADMIN' || role === 'SUPERADMIN' || role === 'SUPER_ADMIN'

export default async function PartnersPage() {
  const session = await auth()
  const user = session?.user ?? null

  if (!user || typeof user.id !== 'string') {
    redirect('/login')
  }

  const role = typeof user.role === 'string' ? user.role : null

  if (!isAdminRole(role)) {
    const identifier = user.email ?? user.id ?? 'unknown'
    await createLog(
      'UNAUTHORIZED_CMS_PARTNERS',
      `User ${identifier} with role ${role ?? 'unknown'} attempted /admin/cms/partners`
    )
    redirect('/admin')
  }

  const partnersRaw = await prisma.partner.findMany({ orderBy: { order: 'asc' } })
  const partners: PartnerDTO[] = partnersRaw.map((partner) => ({
    id: partner.id,
    name: partner.name,
    logoUrl: partner.logoUrl,
    websiteUrl: partner.websiteUrl ?? null,
    order: partner.order,
    isVisible: partner.isVisible
  }))

  return <PartnersManagerClient initialPartners={partners} />
}
