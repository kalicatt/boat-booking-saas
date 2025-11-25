import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // On crée les 4 barques
  const boats = [
    { name: 'Le Cygne (Barque 1)', capacity: 12 },
    { name: 'La Nymphe (Barque 2)', capacity: 12 },
    { name: 'Le Triton (Barque 3)', capacity: 12 },
    { name: 'La Sirène (Barque 4)', capacity: 12 },
  ]

  for (const boat of boats) {
    await prisma.boat.create({
      data: boat
    })
  }
  console.log('4 Barques créées !')
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