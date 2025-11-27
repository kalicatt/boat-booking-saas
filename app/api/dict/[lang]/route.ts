import { NextResponse, NextRequest } from 'next/server'
import { getDictionary, SUPPORTED_LOCALES } from '@/lib/get-dictionary'

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
  const locale = SUPPORTED_LOCALES.includes(raw as any) ? raw as any : 'en'
  try {
    const dict = getDictionary(locale)
    return NextResponse.json({ locale, dict })
  } catch (e: any) {
    return NextResponse.json({ error: 'failed', message: e?.message }, { status: 500 })
  }
}
