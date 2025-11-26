import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'

export async function GET() {
  try {
    const blocks = await prisma.blockedInterval.findMany({ orderBy: { start: 'desc' } })
    return NextResponse.json(blocks)
  } catch (e) {
    return NextResponse.json({ error: 'Erreur récupération des blocs' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { start, end, scope, reason } = body
    if (!start || !end || !scope) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    const created = await prisma.blockedInterval.create({
      data: {
        start: new Date(start),
        end: new Date(end),
        scope,
        reason,
        createdById: session.user.id,
      }
    })

    await createLog('BLOCK_ADD', `Blocage ${scope} du ${start} au ${end}${reason ? ` (${reason})` : ''}`)
    return NextResponse.json(created)
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création bloc' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const deleted = await prisma.blockedInterval.delete({ where: { id } })
    await createLog('BLOCK_DELETE', `Suppression blocage ${deleted.scope} (${deleted.start.toISOString()} -> ${deleted.end.toISOString()})`)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression bloc' }, { status: 500 })
  }
}
