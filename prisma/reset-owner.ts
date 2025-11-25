import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'servaislucas68@gmail.com' // Ton email
  const password = 'temp123' // Un mot de passe temporaire sûr

  const hashedPassword = await bcrypt.hash(password, 10)

  // On utilise upsert : Si existe, on met à jour. Sinon, on crée.
  const owner = await prisma.user.upsert({
    where: { email: email },
    update: {
      role: 'SUPERADMIN',
      password: hashedPassword,
      firstName: 'Lucas',
      lastName: 'Servais'
    },
    create: {
      email: email,
      role: 'SUPERADMIN',
      password: hashedPassword,
      firstName: 'Lucas',
      lastName: 'Servais',
      phone: '0650693815'
    }
  })
  
  console.log('✅ Compte Propriétaire réinitialisé avec succès !')
  console.log(`📧 Email : ${email}`)
  console.log(`🔑 Mot de passe : ${password}`)
  console.log(`👑 Rôle : ${owner.role}`)
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect() })