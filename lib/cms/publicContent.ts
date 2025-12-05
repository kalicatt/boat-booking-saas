import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type LocaleCode, type TranslationRecord } from '@/types/cms'
import { mapHeroSlide, mapPartner, mapSiteConfigEntry, type CmsPayload } from './contentSelectors'

const fetchPublishedPayload = async (): Promise<CmsPayload> => {
  const [siteConfigs, heroSlides, partners] = await Promise.all([
    prisma.siteConfig.findMany({ orderBy: { key: 'asc' } }),
    prisma.heroSlide.findMany({ orderBy: { order: 'asc' } }),
    prisma.partner.findMany({ orderBy: { order: 'asc' } })
  ])

  return {
    siteConfig: siteConfigs.map((entry) => mapSiteConfigEntry(entry, false)),
    heroSlides: heroSlides.map((slide) => mapHeroSlide(slide, false)),
    partners: partners.map((partner) => mapPartner(partner, false))
  }
}

export const getPublishedCmsPayload = unstable_cache(fetchPublishedPayload, ['cms:published'], {
  revalidate: 300,
  tags: ['cms:published']
})

export const resolveCmsValue = (value: TranslationRecord | string, locale: LocaleCode): string => {
  if (typeof value === 'string') {
    return value
  }
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
  const direct = value[safeLocale]
  if (direct && direct.trim().length) {
    return direct
  }
  const fallback = value[DEFAULT_LOCALE]
  if (fallback && fallback.trim().length) {
    return fallback
  }
  for (const code of SUPPORTED_LOCALES) {
    const candidate = value[code]
    if (candidate && candidate.trim().length) {
      return candidate
    }
  }
  return ''
}

export const getSiteConfigValue = (
  payload: CmsPayload,
  key: string,
  locale: LocaleCode
): string => {
  const entry = payload.siteConfig.find((item) => item.key === key)
  if (!entry) return ''
  return resolveCmsValue(entry.value, locale)
}

export type { CmsPayload } from './contentSelectors'
