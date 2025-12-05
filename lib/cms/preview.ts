import { prisma } from '@/lib/prisma'
import { mapHeroSlide, mapPartner, mapSiteConfigEntry, type CmsPayload } from './contentSelectors'

export type CmsPreviewPayload = CmsPayload

export const getCmsPreviewPayload = async (): Promise<CmsPreviewPayload> => {
  const [siteConfigs, heroSlides, partners] = await Promise.all([
    prisma.siteConfig.findMany({ orderBy: { key: 'asc' } }),
    prisma.heroSlide.findMany({ orderBy: { order: 'asc' } }),
    prisma.partner.findMany({ orderBy: { order: 'asc' } })
  ])

  return {
    siteConfig: siteConfigs.map((entry) => mapSiteConfigEntry(entry, true)),
    heroSlides: heroSlides.map((slide) => mapHeroSlide(slide, true)),
    partners: partners.map((partner) => mapPartner(partner, true))
  }
}
