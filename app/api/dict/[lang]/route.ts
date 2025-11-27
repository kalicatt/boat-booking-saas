import { NextResponse } from 'next/server'
import { getDictionary, SUPPORTED_LOCALES } from '@/lib/get-dictionary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { lang: string } }) {
  const raw = params.lang
  const locale = SUPPORTED_LOCALES.includes(raw as any) ? raw as any : 'en'
  try {
    const dict = getDictionary(locale)
    return NextResponse.json({ locale, dict })
  } catch (e:any) {
    return NextResponse.json({ error: 'failed', message: e?.message }, { status: 500 })
  }
}
