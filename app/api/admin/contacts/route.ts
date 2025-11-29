import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma, ContactStatus } from '@prisma/client'

const CONTACT_STATUSES: ContactStatus[] = ['NEW','CONTACTED','CLOSED']

const isContactStatus = (value: unknown): value is ContactStatus =>
  typeof value === 'string' && CONTACT_STATUSES.includes(value as ContactStatus)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const where: Prisma.ContactRequestWhereInput = {}
    if (statusParam && isContactStatus(statusParam)) where.status = statusParam
    const contacts = await prisma.contactRequest.findMany({
      where: where as Prisma.ContactRequestWhereInput,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(contacts)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Erreur chargement contacts', details: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contactId } = body || {}
    if (!contactId) return NextResponse.json({ error: 'contactId requis' }, { status: 400 })
    const contact = await prisma.contactRequest.findUnique({ where: { id: contactId } })
    if (!contact) return NextResponse.json({ error: 'Contact introuvable' }, { status: 404 })

    const isGroup = contact.kind === 'group'
    const people = typeof contact.people === 'number' ? contact.people : 0
    const payload: Record<string, unknown> = {
      date: contact.date || new Date().toISOString().slice(0,10),
      time: '10:00',
      adults: isGroup ? people : Math.max(1, people),
      children: 0,
      babies: 0,
      language: contact.lang || 'fr',
      userDetails: { firstName: contact.firstName, lastName: contact.lastName, email: contact.email },
      isStaffOverride: true,
      message: contact.message || undefined,
    }
    if (isGroup && people>0) {
      payload.groupChain = people
    } else if (contact.kind === 'private') {
      payload.private = true
    }

    const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    const data = await resp.json()
    if (!resp.ok) return NextResponse.json(data, { status: resp.status })

    // Optionally mark contact as CLOSED
    try { await prisma.contactRequest.update({ where: { id: contactId }, data: { status: 'CLOSED' } }) } catch {}

    return NextResponse.json({ success: true, result: data })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Erreur conversion contact', details: msg }, { status: 500 })
  }
}