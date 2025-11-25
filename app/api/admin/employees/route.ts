import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'

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

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    // SÉCURITÉ MAXIMALE : SEUL LE SUPERADMIN PEUT CRÉER
    if (session?.user?.role !== 'SUPERADMIN') {
        return NextResponse.json({ 
            error: "⛔ Accès refusé. Seul le Propriétaire (SuperAdmin) peut recruter." 
        }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, address, password, role } = body // Ajout address

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return NextResponse.json({ error: "Email déjà utilisé." }, { status: 400 })

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        firstName, lastName, email, phone, address, // Ajout address
        password: hashedPassword,
        role: role || 'EMPLOYEE'
      }
    })

    return NextResponse.json({ success: true, user: newUser })
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    // SÉCURITÉ MAXIMALE : SEUL LE SUPERADMIN PEUT SUPPRIMER
    if (session?.user?.role !== 'SUPERADMIN') {
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

    await prisma.workShift.deleteMany({ where: { userId: targetId } })
    await prisma.user.delete({ where: { id: targetId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    
    // SÉCURITÉ : SEUL LE SUPERADMIN PEUT MODIFIER
    if (session?.user?.role !== 'SUPERADMIN') {
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
      dataToUpdate.password = await bcrypt.hash(password, 10)
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
