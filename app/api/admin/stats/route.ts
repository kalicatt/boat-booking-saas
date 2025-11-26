import { NextResponse } from 'next/server'
import { parseISO } from 'date-fns'
import { getStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') || undefined
    const end = searchParams.get('end') || undefined
    const status = searchParams.getAll('status')
    const language = searchParams.getAll('language')

    const result = await getStats({ start, end, status: status.length ? status : undefined, language: language.length ? language : undefined })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur Stats API:', error)
    return NextResponse.json({ error: 'Erreur calcul stats' }, { status: 500 })
  }
}