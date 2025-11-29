import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  // --- Flotte de base ---
  const boats = [
    { name: 'Le Cygne (Barque 1)', capacity: 12 },
    { name: 'La Nymphe (Barque 2)', capacity: 12 },
    { name: 'Le Triton (Barque 3)', capacity: 12 },
    { name: 'La Sirène (Barque 4)', capacity: 12 }
  ]

  for (const boat of boats) {
    await prisma.boat.upsert({
      where: { name: boat.name },
      update: { capacity: boat.capacity },
      create: boat
    })
  }
  console.log('✅ Flotte de barques synchronisée')

  // --- Comptes administratifs génériques ---
  const defaultPassword = process.env.GENERIC_ADMIN_SEED_PASSWORD ?? 'ChangeMe123!'
  const hashedPassword = await hash(defaultPassword, 10)

  const genericAdmins = [
    { email: 'guichet@sweet-narcisse.fr', label: 'Guichet' },
    { email: 'gestion@sweet-narcisse.fr', label: 'Gestion' },
    { email: 'tract@sweet-narcisse.fr', label: 'Tract' }
  ]

  for (const admin of genericAdmins) {
    await prisma.user.upsert({
      where: { email: admin.email.toLowerCase() },
      update: {
        firstName: 'Compte',
        lastName: admin.label,
        password: hashedPassword,
        role: 'ADMIN',
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        country: null,
        dateOfBirth: null,
        gender: null,
        employeeNumber: null,
        hireDate: null,
        department: null,
        jobTitle: null,
        managerId: null,
        employmentStatus: 'PERMANENT',
        isFullTime: true,
        hourlyRate: null,
        annualSalary: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        notes: null
      },
      create: {
        email: admin.email.toLowerCase(),
        password: hashedPassword,
        firstName: 'Compte',
        lastName: admin.label,
        role: 'ADMIN'
      }
    })
  }

  console.log('✅ Comptes admin génériques prêts (pensez à changer leur mot de passe)')
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