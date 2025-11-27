import 'server-only'

import en from '@/dictionaries/en.json'
import fr from '@/dictionaries/fr.json'
import de from '@/dictionaries/de.json'
import es from '@/dictionaries/es.json'
import it from '@/dictionaries/it.json'

const dictionaries = { en, fr, de, es, it }
export type SupportedLocale = keyof typeof dictionaries

export function getDictionary(locale: SupportedLocale) {
  return dictionaries[locale] || dictionaries.en
}