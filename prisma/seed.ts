import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  // --- Flotte de base ---
  const boats = [
    { name: '2022 (Barque 1)', capacity: 12 },
    { name: '2024 (Barque 2)', capacity: 12 },
    { name: '2025(Barque 3)', capacity: 12 },
    { name: '2021 (Barque 4)', capacity: 12 }
  ]

  for (const boat of boats) {
    const existing = await prisma.boat.findFirst({ where: { name: boat.name } })
    if (existing) {
      await prisma.boat.update({
        where: { id: existing.id },
        data: { capacity: boat.capacity }
      })
    } else {
      await prisma.boat.create({ data: boat })
    }
  }
  console.log('✅ Flotte de barques synchronisée')

  // --- Comptes administratifs ---
  const defaultPassword = process.env.GENERIC_ADMIN_SEED_PASSWORD ?? 'ChangeMe123!'
  const hashedPassword = await hash(defaultPassword, 10)
  
  // Mot de passe spécifique propriétaire
  const ownerPassword = await hash('temp123', 10)

  type AdminSeed = {
    email: string
    label: string
    role: 'EMPLOYEE' | 'ADMIN' | 'SUPERADMIN'
    pass: string
    firstName?: string
    phone?: string | null
  }

  const admins: AdminSeed[] = [
    { email: 'guichet@sweet-narcisse.fr', label: 'Guichet', role: 'EMPLOYEE', pass: hashedPassword },
    { email: 'gestion@sweet-narcisse.fr', label: 'Gestion', role: 'EMPLOYEE', pass: hashedPassword },
    { email: 'tract@sweet-narcisse.fr', label: 'Tract', role: 'EMPLOYEE', pass: hashedPassword },
    {
      email: 'servaislucas68@gmail.com',
      label: 'Servais',
      firstName: 'Lucas',
      role: 'SUPERADMIN',
      pass: ownerPassword,
      phone: '0650693815'
    }
  ]

  for (const u of admins) {
    await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {
        firstName: u.firstName || 'Compte',
        lastName: u.label,
        password: u.pass,
        role: u.role,
        phone: u.phone || null
      },
      create: {
        email: u.email.toLowerCase(),
        password: u.pass,
        firstName: u.firstName || 'Compte',
        lastName: u.label,
        role: u.role,
        phone: u.phone || null
      }
    })
  }

  console.log('✅ Comptes admin & Propriétaire prêts')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })