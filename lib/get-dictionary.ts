import 'server-only'
import fs from 'fs'
import path from 'path'

export const SUPPORTED_LOCALES = ['en','fr','de','es','it'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

function readJson(locale: SupportedLocale) {
  const filePath = path.join(process.cwd(), 'dictionaries', `${locale}.json`)
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

export function getDictionary(locale: SupportedLocale) {
  try {
    if(!SUPPORTED_LOCALES.includes(locale)) return readJson('en')
    return readJson(locale)
  } catch (e) {
    // Fallback francophone first if english missing unexpectedly
    try { return readJson('fr') } catch { return readJson('en') }
  }
}