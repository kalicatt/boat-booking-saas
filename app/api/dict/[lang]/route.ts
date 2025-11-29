import { NextResponse, NextRequest } from 'next/server'
import { getDictionary, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/get-dictionary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Use NextRequest and allow context.params to be Promise-based for compatibility with Next's inferred types
export async function GET(req: NextRequest, context: { params: Promise<{ lang: string }> | { lang: string } }) {
  let langValue: string | undefined
  try {
    if (context.params instanceof Promise) {
      const resolved = await context.params
      langValue = resolved.lang
    } else {
      langValue = context.params.lang
    }
  } catch {
    langValue = 'en'
  }
  const raw = langValue || 'en'
  const locale: SupportedLocale = SUPPORTED_LOCALES.includes(raw as SupportedLocale)
    ? (raw as SupportedLocale)
    : 'en'
  try {
    const dict = getDictionary(locale)
    return NextResponse.json({ locale, dict })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'failed', message }, { status: 500 })
  }
}
