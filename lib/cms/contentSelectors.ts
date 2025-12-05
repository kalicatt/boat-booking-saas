import { normalizeTranslationRecord, type HeroSlideDraftPayload, type PartnerDraftData, type TranslationRecord } from '@/types/cms'
import type { HeroSlide, Partner, SiteConfig } from '@prisma/client'

export type CmsSiteEntry = { key: string; value: TranslationRecord | string }
export type CmsHeroSlide = {
  id: string
  order: number
  isActive: boolean
  imageDesktop: string
  imageMobile: string | null
  title: TranslationRecord
  subtitle: TranslationRecord
}
export type CmsPartner = {
  id: string
  order: number
  isVisible: boolean
  name: string
  logoUrl: string
  websiteUrl: string | null
}

export type CmsPayload = {
  siteConfig: CmsSiteEntry[]
  heroSlides: CmsHeroSlide[]
  partners: CmsPartner[]
}

const isHeroDraftPayload = (value: unknown): value is HeroSlideDraftPayload => {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return typeof payload.imageDesktop === 'string' && typeof payload.title === 'object'
}

const isPartnerDraft = (value: unknown): value is PartnerDraftData => {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return typeof payload.name === 'string' && typeof payload.logoUrl === 'string'
}

const resolveSiteValue = (value: unknown): TranslationRecord | string => {
  if (typeof value === 'string') {
    return value
  }
  if (!value || typeof value !== 'object') {
    return ''
  }
  const normalized = normalizeTranslationRecord(value)
  if (Object.keys(normalized).length) {
    return normalized
  }
  if (typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value
  }
  return ''
}

export const mapSiteConfigEntry = (entry: SiteConfig, preferDraft: boolean): CmsSiteEntry => {
  const raw = preferDraft ? entry.draftValues ?? entry.publishedValues : entry.publishedValues
  return {
    key: entry.key,
    value: resolveSiteValue(raw)
  }
}

export const mapHeroSlide = (slide: HeroSlide, preferDraft: boolean): CmsHeroSlide => {
  if (preferDraft && isHeroDraftPayload(slide.draftPayload)) {
    const draft = slide.draftPayload
    return {
      id: slide.id,
      order: slide.order,
      isActive: draft.isActive,
      imageDesktop: draft.imageDesktop,
      imageMobile: draft.imageMobile,
      title: draft.title,
      subtitle: draft.subtitle
    }
  }
  return {
    id: slide.id,
    order: slide.order,
    isActive: slide.isActive,
    imageDesktop: slide.imageDesktop,
    imageMobile: slide.imageMobile ?? null,
    title: normalizeTranslationRecord(slide.title),
    subtitle: normalizeTranslationRecord(slide.subtitle)
  }
}

export const mapPartner = (partner: Partner, preferDraft: boolean): CmsPartner => {
  if (preferDraft && isPartnerDraft(partner.draftData)) {
    const draft = partner.draftData
    return {
      id: partner.id,
      order: typeof draft.order === 'number' ? draft.order : partner.order,
      isVisible: typeof draft.isVisible === 'boolean' ? draft.isVisible : partner.isVisible,
      name: draft.name,
      logoUrl: draft.logoUrl,
      websiteUrl: draft.websiteUrl ?? null
    }
  }
  return {
    id: partner.id,
    order: partner.order,
    isVisible: partner.isVisible,
    name: partner.name,
    logoUrl: partner.logoUrl,
    websiteUrl: partner.websiteUrl ?? null
  }
}
