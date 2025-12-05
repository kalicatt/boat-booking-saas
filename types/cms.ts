export const SUPPORTED_LOCALES = ['fr', 'en', 'de'] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: LocaleCode = 'fr'

export type TranslationRecord = Partial<Record<LocaleCode, string>>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const normalizeTranslationRecord = (input: unknown): TranslationRecord => {
  if (!isRecord(input)) return {}
  const result: TranslationRecord = {}
  for (const locale of SUPPORTED_LOCALES) {
    const candidate = input[locale]
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed.length > 0) {
        result[locale] = trimmed
      }
    }
  }
  return result
}

export type HeroSlideDTO = {
  id: string
  imageDesktop: string
  imageMobile: string | null
  isActive: boolean
  order: number
  title: TranslationRecord
  subtitle: TranslationRecord
}

export type HeroSlideDraftPayload = {
  title: TranslationRecord
  subtitle: TranslationRecord
  imageDesktop: string
  imageMobile: string | null
  isActive: boolean
}

export type PartnerDTO = {
  id: string
  name: string
  logoUrl: string
  websiteUrl: string | null
  order: number
  isVisible: boolean
}

export type PartnerDraftData = {
  name: string
  logoUrl: string
  websiteUrl: string | null
  isVisible: boolean
  order?: number
}
