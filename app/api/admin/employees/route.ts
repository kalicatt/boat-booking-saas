import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { auth } from '@/auth'
import { createLog } from '@/lib/logger'
import { EmployeeCreateSchema, EmployeeUpdateSchema, toNumber, cleanString } from '@/lib/validation'
import { normalizeIncoming } from '@/lib/phone'
import { evaluatePassword } from '@/lib/passwordPolicy'

type EmployeeSessionUser = {
  id?: string | null
  role?: string | null
  email?: string | null
}

// --- GET : LISTER LES EMPLOYÉS ---
export async function GET() {
  try {
    const session = await auth()
    const sessionUser = (session?.user ?? null) as EmployeeSessionUser | null
    const role = typeof sessionUser?.role === 'string' ? sessionUser.role : null

    if (!role || !['EMPLOYEE', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: '⛔ Accès refusé.' }, { status: 403 })
    }

    const employees = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN', 'SUPERADMIN'] } },
      orderBy: [{ role: 'desc' }, { lastName: 'asc' }]
    })

    const managerIds = Array.from(new Set(employees.map((emp) => emp.managerId).filter(Boolean) as string[]))
    const managers = managerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: managerIds } },
          select: { id: true, firstName: true, lastName: true, email: true }
        })
      : []
    const managerMap = new Map(managers.map((m) => [m.id, m]))

    const base = employees.map((employee) => {
      const { password: passwordField, ...rest } = employee
      void passwordField
      return rest
    })

    if (role === 'EMPLOYEE') {
      const light = base.map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: emp.role,
        email: emp.email,
        phone: emp.phone,
        address: emp.address,
        city: emp.city,
        postalCode: emp.postalCode,
        country: emp.country,
        jobTitle: emp.jobTitle,
        department: emp.department,
        employeeNumber: emp.employeeNumber,
        image: emp.image,
        manager: emp.managerId ? managerMap.get(emp.managerId) ?? null : null
      }))

      return NextResponse.json(light)
    }

    const extended = base.map((emp) => ({
      ...emp,
      manager: emp.managerId ? managerMap.get(emp.managerId) ?? null : null
    }))
    return NextResponse.json(extended)
  } catch (error) {
    console.error('GET /api/admin/employees', error)
    return NextResponse.json({ error: 'Erreur chargement' }, { status: 500 })
  }
}

// --- POST : CRÉER UN EMPLOYÉ ---
export async function POST(request: Request) {
  try {
    const session = await auth()

    const userSession = (session?.user ?? null) as EmployeeSessionUser | null

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
    const {
      firstName,
      lastName,
      email,
      phone: rawPhone,
      address,
      city,
      postalCode,
      country,
      password,
      role,
      dateOfBirth,
      gender,
      hireDate,
      department,
      jobTitle,
      employmentStatus,
      fullTime,
      hourlyRate,
      salary,
      emergencyContactName,
      emergencyContactPhone,
      notes
    } = parsed.data

    // Normalisation E.164 si le numéro commence par '+'
    let phone = rawPhone ?? undefined
    if (phone && phone.startsWith('+')) {
      phone = normalizeIncoming(phone)
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return NextResponse.json({ error: "Email déjà utilisé." }, { status: 409 })

    const passwordPolicy = evaluatePassword(password, [email, firstName, lastName])
    if (!passwordPolicy.valid) {
      return NextResponse.json({ error: passwordPolicy.feedback || 'Mot de passe trop faible', score: passwordPolicy.score }, { status: 422 })
    }

    const hashedPassword = await hash(password, 10)

    const managerId = userSession?.id ?? undefined

    const generatedEmployeeNumber = await prisma.$transaction(async (tx) => {
      const year = new Date().getUTCFullYear()
      const seqName = `employee_number_${year}`
      const seq = await tx.sequence.upsert({
        where: { name: seqName },
        create: { name: seqName, current: 1 },
        update: { current: { increment: 1 } }
      })
      const padded = String(seq.current).padStart(4, '0')
      return `EMP-${year}-${padded}`
    })

    const newUser = await prisma.user.create({
      data: {
        firstName: cleanString(firstName, 60)!,
        lastName: cleanString(lastName, 60)!,
        email: email.toLowerCase(),
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
        password: hashedPassword,
        role: userSession.role === 'ADMIN' ? 'EMPLOYEE' : role || 'EMPLOYEE',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender: gender || undefined,
        employeeNumber: generatedEmployeeNumber,
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
        notes: notes || undefined
      }
    })

    await createLog('EMPLOYEE_CREATE', `Création employé ${newUser.firstName} ${newUser.lastName} (${newUser.email})`)

    const { password: passwordHidden, ...safeUser } = newUser
    void passwordHidden

    return NextResponse.json({ success: true, user: safeUser })
  } catch (error) {
    console.error('POST /api/admin/employees', error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// --- DELETE : SUPPRIMER UN EMPLOYÉ ---
export async function DELETE(request: Request) {
  try {
    const session = await auth()

    const userSession = (session?.user ?? null) as EmployeeSessionUser | null

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
    console.error('DELETE /api/admin/employees', error)
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 })
  }
}

// --- PUT : MODIFIER UN EMPLOYÉ ---
export async function PUT(request: Request) {
  try {
    const session = await auth()

    const userSession = (session?.user ?? null) as EmployeeSessionUser | null

    if (userSession?.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: "Action refusée." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = EmployeeUpdateSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    const {
      id,
      firstName,
      lastName,
      email,
      phone: rawPhone,
      address,
      city,
      postalCode,
      country,
      password,
      role,
      dateOfBirth,
      gender,
      employeeNumber,
      hireDate,
      department,
      jobTitle,
      managerId,
      employmentStatus,
      fullTime,
      hourlyRate,
      salary,
      emergencyContactName,
      emergencyContactPhone,
      notes
    } = parsed.data

    let phone = rawPhone ?? undefined
    if (phone && phone.startsWith('+')) {
      phone = normalizeIncoming(phone)
    }

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

    // Préparation des données à mettre à jour
    const dataToUpdate: Prisma.UserUpdateInput = {
      firstName,
      lastName,
      email,
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
      let policyInputs: string[] = []
      if (email) policyInputs.push(email)
      if (firstName) policyInputs.push(firstName)
      if (lastName) policyInputs.push(lastName)
      if (policyInputs.length === 0) {
        const existing = await prisma.user.findUnique({ where: { id }, select: { email: true, firstName: true, lastName: true } })
        if (existing) {
          policyInputs = [existing.email, existing.firstName, existing.lastName].filter(Boolean) as string[]
        }
      }
      const policy = evaluatePassword(password, policyInputs)
      if (!policy.valid) {
        return NextResponse.json({ error: policy.feedback || 'Mot de passe trop faible', score: policy.score }, { status: 422 })
      }
      dataToUpdate.password = await hash(password, 10)
    }

    // Mise à jour
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate
    })

    await createLog('EMPLOYEE_UPDATE', `Mise à jour employé ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.email})`)

  const { password: passwordHidden, ...safeUser } = updatedUser
  void passwordHidden

  return NextResponse.json({ success: true, user: safeUser })
  } catch (error) {
    console.error('PUT /api/admin/employees', error)
    return NextResponse.json({ error: "Erreur lors de la modification (Email déjà pris ?)" }, { status: 500 })
  }
}