import { NextResponse, NextRequest } from 'next/server'
import { getDictionary, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/get-dictionary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, context: { params: Promise<{ lang: string }> }) {
  let langValue = 'en'
  try {
    const resolved = await context.params
    if (resolved?.lang) langValue = resolved.lang
  } catch {
    // ignore
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
