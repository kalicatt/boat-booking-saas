import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'
import { cleanString, stripScriptTags } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

const profileUpdateSchema = z
  .object({
    image: z.string().max(2_500_000).optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(80).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(80).optional(),
    gender: z.string().max(20).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    emergencyContactName: z.string().max(80).optional(),
    emergencyContactPhone: z.string().max(30).optional(),
    notes: z.string().max(2000).optional()
  })
  .strict()

const mobileMask = (value?: string | null) => (value ? cleanString(value, 30) : undefined)

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      image: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      country: true,
      gender: true,
      dateOfBirth: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      notes: true,
      employeeNumber: true,
      hireDate: true,
      department: true,
      jobTitle: true,
      managerId: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const manager = user.managerId
    ? await prisma.user.findUnique({
        where: { id: user.managerId },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
    : null

  return NextResponse.json({
    ...user,
    manager,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    hireDate: user.hireDate ? user.hireDate.toISOString().slice(0, 10) : null
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const ip = getClientIp(request.headers)
  const rl = rateLimit({ key: `profile:update:${userId}:${ip}`, limit: 40, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })
  }

  const json = await request.json().catch(() => null)
  if (!json || (typeof json !== 'object')) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
  }

  const parsed = profileUpdateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
  }

  const {
    image,
    phone,
    address,
    city,
    postalCode,
    country,
    gender,
    dateOfBirth,
    emergencyContactName,
    emergencyContactPhone,
    notes
  } = parsed.data

  const data: Record<string, unknown> = {}

  if (image !== undefined) {
    data.image = image || null
  }
  if (phone !== undefined) data.phone = mobileMask(phone) ?? null
  if (address !== undefined) data.address = cleanString(address, 200) ?? null
  if (city !== undefined) data.city = cleanString(city, 80) ?? null
  if (postalCode !== undefined) data.postalCode = cleanString(postalCode, 20) ?? null
  if (country !== undefined) data.country = cleanString(country, 80) ?? null
  if (gender !== undefined) data.gender = cleanString(gender, 20) ?? null
  if (dateOfBirth !== undefined) {
    data.dateOfBirth = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null
  }
  if (emergencyContactName !== undefined) {
    data.emergencyContactName = cleanString(emergencyContactName, 80) ?? null
  }
  if (emergencyContactPhone !== undefined) {
    data.emergencyContactPhone = mobileMask(emergencyContactPhone) ?? null
  }
  if (notes !== undefined) {
    data.notes = notes ? stripScriptTags(cleanString(notes, 2000)) ?? null : null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data
  })

  await createLog('PROFILE_UPDATE', `Mise à jour du profil ${updated.email}`)

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      image: updated.image,
      phone: updated.phone,
      address: updated.address,
      city: updated.city,
      postalCode: updated.postalCode,
      country: updated.country,
      gender: updated.gender,
      dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.toISOString().slice(0, 10) : null,
      emergencyContactName: updated.emergencyContactName,
      emergencyContactPhone: updated.emergencyContactPhone,
      notes: updated.notes
    }
  })
}
