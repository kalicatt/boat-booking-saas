import 'server-only'
import en from '@/dictionaries/en.json'
import fr from '@/dictionaries/fr.json'
import de from '@/dictionaries/de.json'
import es from '@/dictionaries/es.json'
import it from '@/dictionaries/it.json'

export const SUPPORTED_LOCALES = ['en','fr','de','es','it'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

type LocaleDictionary = typeof en

const dictionaries: Record<SupportedLocale, LocaleDictionary> = { en, fr, de, es, it }

export function getDictionary(locale: SupportedLocale): LocaleDictionary {
  if (!SUPPORTED_LOCALES.includes(locale)) return dictionaries.en
  return dictionaries[locale] || dictionaries.en
}