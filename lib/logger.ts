import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function createLog(action: string, details: string) {
  try {
    // 1. On récupère l'utilisateur connecté
    const session = await auth()
    const userId = session?.user?.id

    // Si personne n'est connecté (ex: script système), on ne peut pas logger l'auteur
    if (!userId) return

    // 2. On écrit dans la base
    await prisma.log.create({
      data: {
        action,
        details,
        userId
      }
    })
  } catch (error) {
    console.error("Erreur lors de la création du log:", error)
    // On ne fait pas planter l'appli si le log échoue, c'est silencieux
  }
}