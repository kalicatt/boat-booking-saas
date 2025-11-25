import { PrismaClient } from '@prisma/client'
import { subYears } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log("🧹 Démarrage du nettoyage annuel...")

  // Date limite : Il y a 1 an pile
  const limitDate = subYears(new Date(), 1)

  // 1. Supprimer les vieilles réservations
  const deletedBookings = await prisma.booking.deleteMany({
    where: { startTime: { lt: limitDate } }
  })

  // 2. Supprimer les vieux pointages employés
  const deletedShifts = await prisma.workShift.deleteMany({
    where: { startTime: { lt: limitDate } }
  })

  // 3. Supprimer les vieux logs
  const deletedLogs = await prisma.log.deleteMany({
    where: { createdAt: { lt: limitDate } }
  })

  console.log(`✅ Nettoyage terminé (Données avant le ${limitDate.toLocaleDateString()}) :`)
  console.log(`- ${deletedBookings.count} réservations supprimées`)
  console.log(`- ${deletedShifts.count} shifts supprimés`)
  console.log(`- ${deletedLogs.count} logs supprimés`)
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })