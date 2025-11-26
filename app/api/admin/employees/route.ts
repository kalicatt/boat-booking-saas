import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'
import { EmployeeCreateSchema, EmployeeUpdateSchema, toNumber } from '@/lib/validation'
import { normalizeIncoming } from '@/lib/phone'

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
    
    // Autorisations: SUPERADMIN et ADMIN peuvent créer des comptes,
    // mais un ADMIN ne peut créer que des EMPLOYEE (pas d'ADMIN)
    if (!userSession?.role || (userSession.role !== 'SUPERADMIN' && userSession.role !== 'ADMIN')) {
      return NextResponse.json({ error: '⛔ Accès refusé.' }, { status: 403 })
    }

    const json = await request.json()
    const parsed = EmployeeCreateSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    let { firstName, lastName, email, phone, address, city, postalCode, country, password, role,
      dateOfBirth, gender, employeeNumber, hireDate, department, jobTitle, managerId,
      employmentStatus, fullTime, hourlyRate, salary, emergencyContactName, emergencyContactPhone, notes } = parsed.data

    // Normalisation E.164 si le numéro commence par '+'
    if (phone && phone.startsWith('+')) {
      phone = normalizeIncoming(phone)
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return NextResponse.json({ error: "Email déjà utilisé." }, { status: 409 })

    const hashedPassword = await hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        firstName, lastName, email,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
        password: hashedPassword,
        role: userSession.role === 'ADMIN' ? 'EMPLOYEE' : (role || 'EMPLOYEE'),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender: gender || undefined,
        employeeNumber: employeeNumber || undefined,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        department: department || undefined,
        jobTitle: jobTitle || undefined,
        managerId: managerId || undefined,
        employmentStatus: employmentStatus || 'PERMANENT',
        isFullTime: fullTime ?? true,
        hourlyRate: toNumber(hourlyRate),
        annualSalary: toNumber(salary),
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        notes: notes || undefined,
      }
    })

    await createLog('EMPLOYEE_CREATE', `Création employé ${newUser.firstName} ${newUser.lastName} (${newUser.email})`) 

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
    await createLog('EMPLOYEE_DELETE', `Suppression employé ${targetUser?.firstName} ${targetUser?.lastName} (${targetUser?.email})`)

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

    const json = await request.json()
    const parsed = EmployeeUpdateSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    let { id, firstName, lastName, email, phone, address, city, postalCode, country, password, role,
      dateOfBirth, gender, employeeNumber, hireDate, department, jobTitle, managerId,
      employmentStatus, fullTime, hourlyRate, salary, emergencyContactName, emergencyContactPhone, notes } = parsed.data

    if (phone && phone.startsWith('+')) {
      phone = normalizeIncoming(phone)
    }

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

    // Préparation des données à mettre à jour
    const dataToUpdate: any = {
      firstName, lastName, email,
      phone: phone || undefined,
      address: address || undefined,
      city: city || undefined,
      postalCode: postalCode || undefined,
      country: country || undefined,
      role,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || undefined,
      employeeNumber: employeeNumber || undefined,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      department: department || undefined,
      jobTitle: jobTitle || undefined,
      managerId: managerId || undefined,
      employmentStatus: employmentStatus || undefined,
      isFullTime: fullTime ?? undefined,
      hourlyRate: toNumber(hourlyRate),
      annualSalary: toNumber(salary),
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
      notes: notes || undefined,
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

    await createLog('EMPLOYEE_UPDATE', `Mise à jour employé ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.email})`)

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la modification (Email déjà pris ?)" }, { status: 500 })
  }
}