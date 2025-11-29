import { NextResponse } from 'next/server'
// parseISO removed — not used
import { getStats } from '@/lib/stats'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role || 'GUEST'
  if (!['ADMIN','SUPERADMIN','SUPER_ADMIN','EMPLOYEE'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
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