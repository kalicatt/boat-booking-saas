import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { auth } from '@/auth'

// 1. FIX: Interface pour définir que le rôle existe pour TypeScript
interface ExtendedUser {
  role?: string
}

// --- GET : LISTER LES EMPLOYÉS ---
export async function GET() {
  try {
    const employees = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN', 'SUPERADMIN'] } },
      orderBy: { role: 'desc' }
    })
    // On enlève le mot de passe par sécurité
    const safeEmployees = employees.map(({ password, ...rest }) => rest)
    return NextResponse.json(safeEmployees)
  } catch (error) {
    return NextResponse.json({ error: "Erreur chargement" }, { status: 500 })
  }
}

// --- POST : CRÉER UN EMPLOYÉ ---
export async function POST(request: Request) {
  try {
    const session = await auth()
    
    // 2. FIX: On force le type ici
    const userSession = session?.user as ExtendedUser | undefined
    
    // SÉCURITÉ MAXIMALE : SEUL LE SUPERADMIN PEUT CRÉER
    if (userSession?.role !== 'SUPERADMIN') {
        return NextResponse.json({ 
            error: "⛔ Accès refusé. Seul le Propriétaire (SuperAdmin) peut recruter." 
        }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, address, password, role } = body

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return NextResponse.json({ error: "Email déjà utilisé." }, { status: 409 })

    const hashedPassword = await hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        firstName, lastName, email, phone, address,
        password: hashedPassword,
        role: role || 'EMPLOYEE'
      }
    })

    return NextResponse.json({ success: true, user: newUser })
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// --- DELETE : SUPPRIMER UN EMPLOYÉ ---
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    // 2. FIX: On force le type ici aussi
    const userSession = session?.user as ExtendedUser | undefined
    
    if (userSession?.role !== 'SUPERADMIN') {
        return NextResponse.json({ 
            error: "⛔ Accès refusé. Seul le Propriétaire peut supprimer un compte." 
        }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetId = searchParams.get('id')
    if (!targetId) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

    // On empêche de supprimer le SuperAdmin lui-même
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } })
    if (targetUser?.role === 'SUPERADMIN') {
        return NextResponse.json({ error: "Impossible de supprimer le Propriétaire." }, { status: 403 })
    }

    // Suppression en cascade manuelle si nécessaire (workShifts)
    await prisma.workShift.deleteMany({ where: { userId: targetId } })
    await prisma.user.delete({ where: { id: targetId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 })
  }
}

// --- PUT : MODIFIER UN EMPLOYÉ ---
export async function PUT(request: Request) {
  try {
    const session = await auth()
    
    // 2. FIX: On force le type ici aussi
    const userSession = session?.user as ExtendedUser | undefined
    
    if (userSession?.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: "Action refusée." }, { status: 403 })
    }

    const body = await request.json()
    const { id, firstName, lastName, email, phone, address, password, role } = body

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

    // Préparation des données à mettre à jour
    const dataToUpdate: any = {
      firstName, lastName, email, phone, address, role
    }

    // Si un nouveau mot de passe est fourni, on le hache et on l'ajoute
    if (password && password.trim() !== '') {
      dataToUpdate.password = await hash(password, 10)
    }

    // Mise à jour
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la modification (Email déjà pris ?)" }, { status: 500 })
  }
}