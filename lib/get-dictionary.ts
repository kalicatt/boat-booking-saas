import 'server-only'

// Types pour TypeScript (facultatif mais conseillé)
const dictionaries = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  fr: () => import('@/dictionaries/fr.json').then((module) => module.default),
  de: () => import('@/dictionaries/de.json').then((module) => module.default),
}

export const getDictionary = async (locale: 'en' | 'fr' | 'de') => {
  return dictionaries[locale]?.() ?? dictionaries.en()
}