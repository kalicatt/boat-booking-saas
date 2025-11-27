import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const sessions = await prisma.cashSession.findMany({ include: { movements: true }, orderBy: { openedAt: 'desc' }, take: 20 })
  return NextResponse.json(sessions)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { action } = body
  if (action === 'open') {
    const { openingFloat, openedById } = body
    const s = await prisma.cashSession.create({ data: { openingFloat: openingFloat ?? 0, openedById } })
    return NextResponse.json(s)
  }
  if (action === 'close') {
    const { sessionId, closingCount, closedById } = body
    const s = await prisma.cashSession.update({ where: { id: sessionId }, data: { closedAt: new Date(), closingCount, closedById } })
    return NextResponse.json(s)
  }
  if (action === 'movement') {
    const { sessionId, kind, amount, note } = body
    const m = await prisma.cashMovement.create({ data: { sessionId, kind, amount, note } })
    return NextResponse.json(m)
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
