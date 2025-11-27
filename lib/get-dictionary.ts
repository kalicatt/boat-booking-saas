import 'server-only'

// Types pour TypeScript (facultatif mais conseillé)
const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((m) => m.default),
  fr: () => import('@/dictionaries/fr.json').then((m) => m.default),
  de: () => import('@/dictionaries/de.json').then((m) => m.default),
  es: () => import('@/dictionaries/es.json').then((m) => m.default),
  it: () => import('@/dictionaries/it.json').then((m) => m.default),
}

export type SupportedLocale = keyof typeof dictionaries

export const getDictionary = async (locale: SupportedLocale) => {
  return dictionaries[locale]?.() ?? dictionaries.en()
}