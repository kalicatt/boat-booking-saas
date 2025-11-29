import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'
import { BlockCreateSchema, BlockUpdateSchema } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

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
    const ip = getClientIp(req.headers)
    const rl = rateLimit({ key: `block:create:${ip}`, limit: 20, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const json = await req.json()
    const parsed = BlockCreateSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    const { start, end, scope, reason, repeat, repeatUntil } = parsed.data

    // Normalize incoming datetime-local to UTC by appending Z if missing seconds
    const normalizeToUtc = (s: string) => {
      // Accept formats like YYYY-MM-DDTHH:MM or full ISO; ensure we store in UTC
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
        return new Date(s + ":00.000Z")
      }
      if (/Z$/.test(s)) {
        return new Date(s)
      }
      // Fallback: treat as UTC by appending Z
      return new Date(s + "Z")
    }

    const normalizedStart = normalizeToUtc(start)
    const normalizedEnd = normalizeToUtc(end)

    if (isNaN(normalizedStart.getTime()) || isNaN(normalizedEnd.getTime())) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 422 })
    }

    if (normalizedEnd.getTime() <= normalizedStart.getTime()) {
      return NextResponse.json({ error: 'Fin avant le début' }, { status: 422 })
    }

    if (repeat === 'daily') {
      if (!repeatUntil) {
        return NextResponse.json({ error: 'repeatUntil requis' }, { status: 422 })
      }

      const repeatLimit = 370
      const startDay = Date.UTC(
        normalizedStart.getUTCFullYear(),
        normalizedStart.getUTCMonth(),
        normalizedStart.getUTCDate()
      )
      const repeatEnd = new Date(`${repeatUntil}T00:00:00Z`)
      if (isNaN(repeatEnd.getTime())) {
        return NextResponse.json({ error: 'repeatUntil invalide' }, { status: 422 })
      }
      const endDay = Date.UTC(repeatEnd.getUTCFullYear(), repeatEnd.getUTCMonth(), repeatEnd.getUTCDate())
      if (endDay < startDay) {
        return NextResponse.json({ error: 'La fin de période doit être après le début' }, { status: 422 })
      }

      const durationMs = normalizedEnd.getTime() - normalizedStart.getTime()
      const blocksToCreate: Parameters<typeof prisma.blockedInterval.create>[0]['data'][] = []

      for (
        let dayIndex = 0, currentDay = startDay;
        currentDay <= endDay;
        dayIndex += 1, currentDay += 86_400_000
      ) {
        if (dayIndex >= repeatLimit) {
          return NextResponse.json({ error: 'Période trop longue (limite 370 jours)' }, { status: 422 })
        }

        const currentStart = new Date(currentDay)
        currentStart.setUTCHours(
          normalizedStart.getUTCHours(),
          normalizedStart.getUTCMinutes(),
          normalizedStart.getUTCSeconds(),
          0
        )
        const currentEnd = new Date(currentStart.getTime() + durationMs)
        blocksToCreate.push({
          start: currentStart,
          end: currentEnd,
          scope,
          reason,
          createdById: session.user.id
        })
      }

      const createdBlocks = await prisma.$transaction(
        blocksToCreate.map((data) => prisma.blockedInterval.create({ data }))
      )

      await createLog(
        'BLOCK_ADD',
        `Blocage récurrent ${scope} du ${start} au ${repeatUntil}${reason ? ` (${reason})` : ''}`
      )
      return NextResponse.json({ created: createdBlocks.length })
    }

    const created = await prisma.blockedInterval.create({
      data: {
        start: normalizedStart,
        end: normalizedEnd,
        scope,
        reason,
        createdById: session.user.id
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
    const ip = getClientIp(req.headers)
    const rl = rateLimit({ key: `block:delete:${ip}`, limit: 40, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })
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

export async function PUT(req: Request) {
  try {
    const session = await auth()
    const ip = getClientIp(req.headers)
    const rl = rateLimit({ key: `block:update:${ip}`, limit: 40, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const json = await req.json()
    const parsed = BlockUpdateSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    const { id, start, end, scope, reason } = parsed.data

    const normalizeToUtc = (s: string | undefined) => {
      if (!s) return undefined
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return new Date(s + ':00.000Z')
      if (/Z$/.test(s)) return new Date(s)
      return new Date(s + 'Z')
    }

    const updated = await prisma.blockedInterval.update({
      where: { id },
      data: {
        start: start ? normalizeToUtc(start) : undefined,
        end: end ? normalizeToUtc(end) : undefined,
        scope: scope ?? undefined,
        reason: reason ?? undefined,
      }
    })
    await createLog('BLOCK_UPDATE', `Mise à jour blocage ${updated.scope} (${updated.start.toISOString()} -> ${updated.end.toISOString()})`)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour bloc' }, { status: 500 })
  }
}
