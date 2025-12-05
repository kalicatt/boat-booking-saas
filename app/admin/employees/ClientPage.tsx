'use client'

import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import Image from 'next/image'
import { AdminPageShell } from '../_components/AdminPageShell'
import {
    ADMIN_PERMISSION_CONFIG,
    ADMIN_PERMISSION_GROUPS,
    ADMIN_PERMISSION_SECTIONS,
    type AdminPermissionKey,
    type AdminPermissionAction,
    type AdminPermissions,
    createEmptyAdminPermissions,
    resolveAdminPermissions,
    hasPermission,
    hasPageAccess
} from '@/types/adminPermissions'

type Props = { canManage?: boolean }

type EmployeeRole = 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE' | 'MANAGER' | 'GUEST' | string

type EmployeeRecord = {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    address?: string | null
    city?: string | null
    postalCode?: string | null
    country?: string | null
    dateOfBirth?: string | null
    gender?: string | null
    hireDate?: string | null
    department?: string | null
    jobTitle?: string | null
    employmentStatus?: string | null
    fullTime?: boolean | null
    isFullTime?: boolean | null
    hourlyRate?: number | string | null
    salary?: number | string | null
    annualSalary?: number | string | null
    emergencyContactName?: string | null
    emergencyContactPhone?: string | null
    notes?: string | null
    password?: string | null
    role?: EmployeeRole | null
    image?: string | null
    employeeNumber?: string | null
    manager?: { firstName?: string | null; lastName?: string | null } | null
    adminPermissions?: AdminPermissions
}

type MeResponse = { role?: EmployeeRole | null; permissions?: AdminPermissions }

type CreateEmployeeForm = {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    city: string
    postalCode: string
    country: string
    dateOfBirth: string
    gender: string
    hireDate: string
    department: string
    jobTitle: string
    employmentStatus: string
    fullTime: boolean
    hourlyRate: string
    salary: string
    emergencyContactName: string
    emergencyContactPhone: string
    notes: string
    password: string
    role: EmployeeRole
    permissions: AdminPermissions
}

type EmployeeWithUser = { user: EmployeeRecord }

const createDefaultFormState = (): CreateEmployeeForm => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    dateOfBirth: '',
    gender: '',
    hireDate: '',
    department: '',
    jobTitle: '',
    employmentStatus: 'PERMANENT',
    fullTime: true,
    hourlyRate: '',
    salary: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
    password: '',
    role: 'EMPLOYEE',
    permissions: createEmptyAdminPermissions()
})

const isEmployeeRecord = (value: unknown): value is EmployeeRecord => {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Partial<EmployeeRecord>
    return typeof candidate.id === 'string' && typeof candidate.firstName === 'string' && typeof candidate.lastName === 'string' && typeof candidate.email === 'string'
}

const parseEmployeesResponse = (payload: unknown): EmployeeRecord[] => {
    if (!Array.isArray(payload)) return []
    return payload
        .filter(isEmployeeRecord)
        .map((record) => ({
            ...record,
            adminPermissions: ensurePermissions(record.adminPermissions)
        }))
}

const extractEmployee = (payload: unknown): EmployeeRecord | null => {
    if (!payload || typeof payload !== 'object') return null
    if (isEmployeeRecord(payload)) {
        return {
            ...payload,
            adminPermissions: ensurePermissions(payload.adminPermissions)
        }
    }
    const candidate = payload as EmployeeWithUser
    if (candidate && typeof candidate === 'object' && candidate.user && isEmployeeRecord(candidate.user)) {
        return {
            ...candidate.user,
            adminPermissions: ensurePermissions(candidate.user.adminPermissions)
        }
    }
    return null
}

const rolePriority: Record<EmployeeRole, number> = {
    SUPERADMIN: 0,
    ADMIN: 1,
    MANAGER: 2,
    EMPLOYEE: 3,
    GUEST: 4
}

const PERMISSION_GROUPED_SECTIONS = Object.entries(ADMIN_PERMISSION_GROUPS)
    .map(([groupKey, meta]) => ({
        key: groupKey as keyof typeof ADMIN_PERMISSION_GROUPS,
        label: meta.label,
        sections: ADMIN_PERMISSION_SECTIONS.filter((section) => ADMIN_PERMISSION_CONFIG[section.key].group === groupKey)
    }))
    .filter((entry) => entry.sections.length > 0)

const ensurePermissions = (value?: AdminPermissions | null): AdminPermissions =>
    value ? resolveAdminPermissions(value) : createEmptyAdminPermissions()

const resolvePermissionField = <K extends AdminPermissionKey>(
    key: K,
    field: 'enabled' | string
): ('enabled' | AdminPermissionAction<K>) | null => {
    if (field === 'enabled') return 'enabled'
    const action = ADMIN_PERMISSION_CONFIG[key].actions.find((candidate) => candidate.key === field)
    return action ? (action.key as AdminPermissionAction<K>) : null
}

const applyPermissionToggle = <K extends AdminPermissionKey>(
    permissions: AdminPermissions | undefined,
    key: K,
    field: 'enabled' | AdminPermissionAction<K>,
    value: boolean
): AdminPermissions => {
    const base = permissions ? { ...permissions } : createEmptyAdminPermissions()
    const current = { ...base[key] }

    if (field === 'enabled') {
        current.enabled = value
        if (!value) {
            for (const action of ADMIN_PERMISSION_CONFIG[key].actions) {
                ;(current as Record<string, boolean>)[action.key] = false
            }
        }
    } else {
        ;(current as Record<string, boolean>)[field] = value
    }

    return { ...base, [key]: current }
}

const sortEmployees = (list: EmployeeRecord[]): EmployeeRecord[] => {
    return [...list].sort((a, b) => {
        const aPriority = rolePriority[a.role ?? 'EMPLOYEE'] ?? 10
        const bPriority = rolePriority[b.role ?? 'EMPLOYEE'] ?? 10
        if (aPriority !== bPriority) return aPriority - bPriority
        return a.lastName.localeCompare(b.lastName)
    })
}

export default function ClientEmployeesPage({ canManage = false }: Props) {
    const [employees, setEmployees] = useState<EmployeeRecord[]>([])
    const [myRole, setMyRole] = useState<EmployeeRole>('EMPLOYEE')
    const [myPermissions, setMyPermissions] = useState<AdminPermissions>(() => createEmptyAdminPermissions())
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)

    const [editTarget, setEditTarget] = useState<EmployeeRecord | null>(null)
    const [editErrors, setEditErrors] = useState<string[]>([])
    const [form, setForm] = useState<CreateEmployeeForm>(() => createDefaultFormState())

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
                const mePayload = (await meRes.json()) as MeResponse
                setMyRole(typeof mePayload?.role === 'string' ? mePayload.role : 'EMPLOYEE')
                setMyPermissions(ensurePermissions(mePayload?.permissions))
                const res = await fetch('/api/admin/employees', { credentials: 'include', cache: 'no-store' })
                const employeesPayload = (await res.json()) as unknown
                setEmployees(sortEmployees(parseEmployeesResponse(employeesPayload)))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const method = 'POST'
        const res = await fetch('/api/admin/employees', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        if (res.ok) {
            const createdPayload = (await res.json().catch(() => null)) as unknown
            const createdUser = extractEmployee(createdPayload)
            if (createdUser) {
                setEmployees((prev) => sortEmployees([createdUser, ...prev]))
            }
            setForm(createDefaultFormState())
        } else {
            const error = (await res.json().catch(() => null)) as { error?: string } | null
            alert(error?.error || "Impossible de créer le collaborateur")
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Supprimer ${name} ?`)) return
        const res = await fetch(`/api/admin/employees?id=${id}`, { method: 'DELETE' })
        if (res.ok) setEmployees((prev) => prev.filter(e => e.id !== id))
    }

    // Prefer server-provided canManage flag; fallback to role check client-side
    const canViewEmployees = myRole === 'SUPERADMIN' || myRole === 'ADMIN' || hasPageAccess(myPermissions, 'employees')
    const canEditEmployees = canManage || myRole === 'SUPERADMIN' || myRole === 'ADMIN' || hasPermission(myPermissions, 'employees', 'edit')
    const canInviteEmployees = myRole === 'SUPERADMIN' || myRole === 'ADMIN' || hasPermission(myPermissions, 'employees', 'invite')
    const localCanManage = canEditEmployees
    const allowCreate = localCanManage && canInviteEmployees

    return (
        <AdminPageShell
            title="Équipe & comptes"
            description="Gérez les accès, les coordonnées et les statuts de l&apos;équipe Sweet Narcisse."
            actions={allowCreate ? (
                <button onClick={()=>setShowCreateModal(true)} className="sn-btn-primary">+ Nouveau collaborateur</button>
            ) : undefined}
        >
            {!localCanManage && !loading && (
                <p className="inline-flex items-center gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                    🔒 Mode lecture seule — vous n&apos;avez pas les droits de modification
                </p>
            )}

            {!canViewEmployees && !loading && (
                <p className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    ❗️ Accès refusé — contactez un administrateur pour obtenir les droits nécessaires.
                </p>
            )}

            {canViewEmployees && (
                <>
                    <CreateEmployeeModal
                        open={showCreateModal}
                        onClose={()=>setShowCreateModal(false)}
                        onSubmit={(event)=>{handleSubmit(event); setShowCreateModal(false)}}
                        form={form}
                        setForm={setForm}
                        myRole={myRole}
                    />

                    {localCanManage ? (
                        <div className="sn-card overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4">Collaborateur</th>
                                        <th className="p-4">Coordonnées</th>
                                        <th className="p-4">Poste</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {loading && (
                                        <tr><td colSpan={4} className="p-8 text-center">Chargement...</td></tr>
                                    )}
                                    {!loading && employees.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center">Aucun collaborateur.</td></tr>
                                    )}
                                    {!loading && employees.length > 0 &&
                                        employees.map((emp) => (
                                            <tr key={emp.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800">
                                                <td className="p-4 align-top">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600">
                                                            {emp.image ? (
                                                                <Image src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} width={48} height={48} className="h-full w-full rounded-full object-cover" />
                                                            ) : (
                                                                `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-semibold text-slate-900">
                                                                {emp.firstName} {emp.lastName}
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                                                                <span className={`rounded-full px-2 py-0.5 border ${
                                                                    emp.role === 'SUPERADMIN'
                                                                        ? 'border-yellow-200 bg-yellow-100 text-yellow-800'
                                                                        : emp.role === 'ADMIN'
                                                                        ? 'border-purple-200 bg-purple-100 text-purple-700'
                                                                        : 'border-blue-200 bg-blue-100 text-blue-700'
                                                                }`}>
                                                                    {emp.role}
                                                                </span>
                                                                {emp.employeeNumber && (
                                                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-500">
                                                                        #{emp.employeeNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-sm text-slate-600">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2"><span aria-hidden="true">📧</span><span>{emp.email}</span></div>
                                                        <div className="flex items-center gap-2"><span aria-hidden="true">📞</span><span>{emp.phone || '-'}</span></div>
                                                        <div className="flex items-start gap-2 text-xs text-slate-400"><span aria-hidden="true">🏠</span><span>{emp.address || emp.city || emp.postalCode ? `${emp.address ?? ''} ${emp.postalCode ?? ''} ${emp.city ?? ''}`.trim() : '-'}</span></div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-sm text-slate-600">
                                                    <div>{emp.jobTitle || '—'}</div>
                                                    <div className="text-xs text-slate-400">{emp.department || '—'}</div>
                                                    {emp.manager && (
                                                        <div className="mt-2 text-xs text-slate-500">
                                                            Manager : {emp.manager.firstName} {emp.manager.lastName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right align-top">
                                                    {emp.role === 'SUPERADMIN' ? (
                                                        <span className="text-xs text-slate-400">Compte protégé</span>
                                                    ) : (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditTarget({
                                                                        ...emp,
                                                                        fullTime: typeof emp.fullTime === 'boolean'
                                                                            ? emp.fullTime
                                                                            : (typeof emp.isFullTime === 'boolean' ? emp.isFullTime : true),
                                                                        salary: emp.salary ?? emp.annualSalary ?? '',
                                                                        adminPermissions: ensurePermissions(emp.adminPermissions)
                                                                    })
                                                                    setEditErrors([])
                                                                }}
                                                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                                                            >
                                                                {myRole === 'SUPERADMIN' ? 'Modifier' : 'Consulter'}
                                                            </button>
                                                            {myRole === 'SUPERADMIN' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(emp.id, emp.firstName)}
                                                                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 hover:text-red-700"
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmployeeDirectory employees={employees} loading={loading} />
                    )}

                    <EditEmployeeModal
                        open={localCanManage && !!editTarget}
                        onClose={()=>{setEditTarget(null); setEditErrors([])}}
                        employee={editTarget}
                        setEmployee={setEditTarget}
                        canEdit={myRole === 'SUPERADMIN'}
                        errors={editErrors}
                        setErrors={setEditErrors}
                        onSaved={(updated)=>{
                            setEmployees(prev => sortEmployees(prev.map(e => e.id === updated.id ? { ...e, ...updated } : e)))
                            setEditTarget(null)
                        }}
                    />
                </>
            )}
        </AdminPageShell>
    )
}

interface EditEmployeeModalProps {
    open: boolean
    onClose: () => void
    employee: EmployeeRecord | null
    setEmployee: React.Dispatch<React.SetStateAction<EmployeeRecord | null>>
    canEdit: boolean
    errors: string[]
    setErrors: React.Dispatch<React.SetStateAction<string[]>>
    onSaved: (updated: EmployeeRecord) => void
}

interface CreateEmployeeModalProps {
    open: boolean
    onClose: () => void
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
    form: CreateEmployeeForm
    setForm: React.Dispatch<React.SetStateAction<CreateEmployeeForm>>
    myRole: EmployeeRole
}

interface EmployeeDirectoryProps {
    employees: EmployeeRecord[]
    loading: boolean
}

function EditEmployeeModal({ open, onClose, employee, setEmployee, canEdit, errors, setErrors, onSaved }: EditEmployeeModalProps) {
    const firstFieldRef = useRef<HTMLInputElement|null>(null)
    const dialogRef = useRef<HTMLDivElement|null>(null)
    useEffect(()=>{ if(open && firstFieldRef.current) firstFieldRef.current.focus() }, [open])
    useEffect(()=>{
        if(!open) return
        const handler = (event: KeyboardEvent) => {
            if(event.key === 'Escape') { event.preventDefault(); onClose(); }
            if(event.key === 'Tab' && dialogRef.current) {
                const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )).filter(el => !el.hasAttribute('disabled'))
                if(focusables.length === 0) return
                const first = focusables[0]
                const last = focusables[focusables.length - 1]
                const currentIndex = focusables.indexOf(document.activeElement as HTMLElement)
                if(event.shiftKey) {
                    if(document.activeElement === first || currentIndex === -1) { event.preventDefault(); last.focus(); }
                } else {
                    if(document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            }
        }
        document.addEventListener('keydown', handler)
        return ()=> document.removeEventListener('keydown', handler)
    }, [open, onClose])
    if (!open || !employee) return null

    const local = { ...employee }
    const readOnly = !canEdit

    const validate = () => {
        const errs:string[] = []
        if (!local.firstName?.trim()) errs.push('Prénom requis')
        if (!local.lastName?.trim()) errs.push('Nom requis')
        if (!local.email?.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) errs.push('Email invalide')
        setErrors(errs)
        return errs.length === 0
    }
    const handleChange = <Field extends keyof EmployeeRecord>(field: Field, value: EmployeeRecord[Field]) => {
        if (readOnly) return
        setEmployee((prev) => {
            if (!prev) return prev
            const next = { ...prev, [field]: value } as EmployeeRecord
            if (field === 'fullTime') {
                const fullTimeValue = Boolean(value)
                next.fullTime = fullTimeValue
                next.isFullTime = fullTimeValue
                return next
            }
            if (field === 'salary') {
                next.salary = value as EmployeeRecord['salary']
                next.annualSalary = value as EmployeeRecord['annualSalary']
                return next
            }
            return next
        })
    }
    const handlePermissionToggle = (section: AdminPermissionKey, field: 'enabled' | string, value: boolean) => {
        if (readOnly) return
        const normalizedField = resolvePermissionField(section, field)
        if (!normalizedField) return
        setEmployee((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                adminPermissions: applyPermissionToggle(prev.adminPermissions, section, normalizedField, value)
            }
        })
    }
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (readOnly) return onClose()
        if (!validate()) return
        const payload = { ...employee, id: employee.id }
        const res = await fetch('/api/admin/employees', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (res.ok) {
            const updatedPayload = (await res.json().catch(() => null)) as unknown
            const updatedEmployee = extractEmployee(updatedPayload)
            if (updatedEmployee) {
                onSaved(updatedEmployee)
            } else {
                setErrors(['Réponse inattendue du serveur'])
            }
        } else {
            const err = (await res.json().catch(() => null)) as { error?: string } | null
            setErrors([err?.error || 'Erreur mise à jour'])
        }
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="dialog" aria-modal="true" aria-labelledby="edit-employee-title" ref={dialogRef}>
            <div className="sn-card w-full max-w-3xl" role="document">
                <div className="p-4 border-b flex justify-between items-center">
                    <div>
                        <h3 id="edit-employee-title" className="font-bold">{canEdit ? 'Modifier' : 'Détails du collaborateur'}</h3>
                        {employee.employeeNumber && (
                            <p className="text-xs text-slate-400">Matricule #{employee.employeeNumber}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800" aria-label="Fermer">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-auto" aria-describedby="edit-errors">
                    {errors.length > 0 && (
                        <div id="edit-errors" className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded" aria-live="polite">
                            <ul className="list-disc pl-4">
                                {errors.map((er: string, i: number)=><li key={i}>{er}</li>)}
                            </ul>
                        </div>
                    )}
                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Identité</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="edit-firstName">Prénom</label>
                                <input
                                    ref={firstFieldRef}
                                    id="edit-firstName"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.firstName || ''}
                                    onChange={e=>handleChange('firstName', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="edit-lastName">Nom</label>
                                <input
                                    id="edit-lastName"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.lastName || ''}
                                    onChange={e=>handleChange('lastName', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date de naissance</label>
                                <input
                                    type="date"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : ''}
                                    onChange={e=>handleChange('dateOfBirth', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Genre</label>
                                <select
                                    className="w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.gender || ''}
                                    onChange={e=>handleChange('gender', e.target.value)}
                                    disabled={readOnly}
                                >
                                    <option value="">Non précisé</option>
                                    <option value="F">Féminin</option>
                                    <option value="M">Masculin</option>
                                    <option value="NB">Non-binaire</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Contact</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="edit-email">Email</label>
                                <input
                                    id="edit-email"
                                    type="email"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.email || ''}
                                    onChange={e=>handleChange('email', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="edit-phone">Téléphone</label>
                                <input
                                    id="edit-phone"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.phone || ''}
                                    onChange={e=>handleChange('phone', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Adresse</label>
                            <textarea
                                className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                value={employee.address || ''}
                                onChange={e=>handleChange('address', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Ville</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.city || ''}
                                    onChange={e=>handleChange('city', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Code postal</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.postalCode || ''}
                                    onChange={e=>handleChange('postalCode', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Pays</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.country || ''}
                                    onChange={e=>handleChange('country', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Contrat</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Département</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.department || ''}
                                    onChange={e=>handleChange('department', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Poste</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.jobTitle || ''}
                                    onChange={e=>handleChange('jobTitle', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date d&apos;embauche</label>
                                <input
                                    type="date"
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.hireDate ? employee.hireDate.slice(0, 10) : ''}
                                    onChange={e=>handleChange('hireDate', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Temps de travail</label>
                                <select
                                    className="w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={(employee.fullTime ?? employee.isFullTime) ? 'FULL' : 'PART'}
                                    onChange={e=>handleChange('fullTime', e.target.value === 'FULL')}
                                    disabled={readOnly}
                                >
                                    <option value="FULL">Temps plein</option>
                                    <option value="PART">Temps partiel</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Statut</label>
                                <select
                                    className="w-full rounded border bg-white p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.employmentStatus || 'PERMANENT'}
                                    onChange={e=>handleChange('employmentStatus', e.target.value)}
                                    disabled={readOnly}
                                >
                                    <option value="PERMANENT">Permanent</option>
                                    <option value="TEMPORARY">Temporaire</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Manager</label>
                                <input
                                    className="w-full rounded border bg-slate-100 p-2 text-slate-500"
                                    value={employee.manager ? `${employee.manager.firstName ?? ''} ${employee.manager.lastName ?? ''}`.trim() : '—'}
                                    disabled
                                />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Rémunération</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Taux horaire (€)</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.hourlyRate ?? ''}
                                    onChange={e=>handleChange('hourlyRate', e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Salaire annuel (€)</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.salary ?? employee.annualSalary ?? ''}
                                    onChange={e=>handleChange('salary', e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Contact d&apos;urgence</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nom</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.emergencyContactName || ''}
                                    onChange={e=>handleChange('emergencyContactName', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Téléphone</label>
                                <input
                                    className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    value={employee.emergencyContactPhone || ''}
                                    onChange={e=>handleChange('emergencyContactPhone', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Notes internes</h4>
                        <textarea
                            className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                            value={employee.notes || ''}
                            onChange={e=>handleChange('notes', e.target.value)}
                            disabled={readOnly}
                        />
                    </section>

                    <section>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Permissions back-office</h4>
                        <p className="text-xs text-slate-500 mb-3">Activez les sections accessibles pour ce collaborateur, puis précisez les actions autorisées.</p>
                        <PermissionsEditor
                            permissions={employee.adminPermissions ?? createEmptyAdminPermissions()}
                            onToggle={handlePermissionToggle}
                            readOnly={!canEdit}
                        />
                    </section>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="border px-4 py-2 rounded">{readOnly ? 'Fermer' : 'Annuler'}</button>
                        {canEdit && (
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Sauvegarder</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}
// Modal de création rapide
function CreateEmployeeModal({ open, onClose, onSubmit, form, setForm, myRole }: CreateEmployeeModalProps) {
    if (!open) return null
    const handlePermissionToggle = (section: AdminPermissionKey, field: 'enabled' | string, value: boolean) => {
        const normalizedField = resolvePermissionField(section, field)
        if (!normalizedField) return
        setForm((prev) => ({
            ...prev,
            permissions: applyPermissionToggle(prev.permissions, section, normalizedField, value)
        }))
    }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-slate-200">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold">Nouveau collaborateur</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">✕</button>
                </div>
                <form onSubmit={onSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Prénom</label>
                            <input required className="w-full p-2 border rounded" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nom</label>
                            <input required className="w-full p-2 border rounded" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                            <input required type="email" className="w-full p-2 border rounded" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Téléphone</label>
                            <input required className="w-full p-2 border rounded" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Adresse</label>
                        <textarea className="w-full p-2 border rounded" value={form.address || ''} onChange={e=>setForm({...form, address: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Ville</label>
                            <input className="w-full p-2 border rounded" value={form.city || ''} onChange={e=>setForm({...form, city: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Code Postal</label>
                            <input className="w-full p-2 border rounded" value={form.postalCode || ''} onChange={e=>setForm({...form, postalCode: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pays</label>
                            <input className="w-full p-2 border rounded" value={form.country || ''} onChange={e=>setForm({...form, country: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date de Naissance</label>
                            <input type="date" className="w-full p-2 border rounded" value={form.dateOfBirth || ''} onChange={e=>setForm({...form, dateOfBirth: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Sexe</label>
                            <select className="w-full p-2 border rounded bg-white" value={form.gender || ''} onChange={e=>setForm({...form, gender: e.target.value})}>
                                <option value="">—</option>
                                <option value="M">Homme</option>
                                <option value="F">Femme</option>
                                <option value="O">Autre</option>
                            </select>
                        </div>
                        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
                            Le numéro employé est attribué automatiquement lors de l&apos;enregistrement.
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date d&apos;embauche</label>
                            <input type="date" className="w-full p-2 border rounded" value={form.hireDate || ''} onChange={e=>setForm({...form, hireDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Département</label>
                            <input className="w-full p-2 border rounded" value={form.department || ''} onChange={e=>setForm({...form, department: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Poste</label>
                            <input className="w-full p-2 border rounded" value={form.jobTitle || ''} onChange={e=>setForm({...form, jobTitle: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Statut</label>
                            <select className="w-full p-2 border rounded bg-white" value={form.employmentStatus || 'PERMANENT'} onChange={e=>setForm({...form, employmentStatus: e.target.value})}>
                                <option value="PERMANENT">Permanent</option>
                                <option value="TEMPORARY">Temporaire</option>
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                                <input type="checkbox" checked={!!form.fullTime} onChange={e=>setForm({...form, fullTime: e.target.checked})} />
                                Temps plein
                            </label>
                        </div>
                        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
                            Le manager assigné correspond automatiquement à l&apos;utilisateur créant la fiche.
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Taux horaire (€)</label>
                            <input className="w-full p-2 border rounded" value={form.hourlyRate || ''} onChange={e=>setForm({...form, hourlyRate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Salaire annuel (€)</label>
                            <input className="w-full p-2 border rounded" value={form.salary || ''} onChange={e=>setForm({...form, salary: e.target.value})} disabled={myRole !== 'SUPERADMIN'} />
                            {myRole !== 'SUPERADMIN' && (
                                <p className="text-[11px] text-slate-500 mt-1">Visible et éditable uniquement par le SuperAdmin.</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Contact Urgence - Nom</label>
                            <input className="w-full p-2 border rounded" value={form.emergencyContactName || ''} onChange={e=>setForm({...form, emergencyContactName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Contact Urgence - Téléphone</label>
                            <input className="w-full p-2 border rounded" value={form.emergencyContactPhone || ''} onChange={e=>setForm({...form, emergencyContactPhone: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
                        <textarea className="w-full p-2 border rounded" value={form.notes || ''} onChange={e=>setForm({...form, notes: e.target.value})} />
                    </div>

                    <section className="space-y-3 border border-slate-100 rounded-xl p-3">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Permissions back-office</h4>
                            <p className="text-xs text-slate-500">Activez les pages accessibles pour ce compte puis cochez les actions autorisées.</p>
                        </div>
                        <PermissionsEditor permissions={form.permissions} onToggle={handlePermissionToggle} />
                    </section>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Mot de passe provisoire</label>
                            <input required className="w-full p-2 border rounded" value={form.password || ''} onChange={e=>setForm({...form, password: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Rôle</label>
                            <select className="w-full p-2 border rounded bg-white" value={form.role} onChange={e => setForm({...form, role: e.target.value})} disabled={myRole === 'ADMIN'}>
                                <option value="EMPLOYEE">Employé</option>
                                {myRole === 'SUPERADMIN' && <option value="ADMIN">Administrateur</option>}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="border px-4 py-2 rounded">Annuler</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Créer</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function EmployeeDirectory({ employees, loading }: EmployeeDirectoryProps) {
    if (loading) {
        return <div className="sn-card p-8 text-center text-sm text-slate-500">Chargement...</div>
    }
    if (employees.length === 0) {
        return <div className="sn-card p-8 text-center text-sm text-slate-500">Aucun collaborateur pour l&apos;instant.</div>
    }
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employees.map((emp) => {
                const displayRole = emp.role ?? 'EMPLOYEE'
                return (
                    <article key={emp.id} className="sn-card flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600">
                                {emp.image ? (
                                    <Image src={emp.image} alt={`${emp.firstName} ${emp.lastName}`} width={48} height={48} className="h-full w-full rounded-full object-cover" />
                                ) : (
                                    `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()
                                )}
                            </div>
                            <div>
                                <div className="font-semibold text-slate-900">
                                    {emp.firstName} {emp.lastName}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                                    <span className={`rounded-full px-2 py-0.5 border ${
                                        displayRole === 'SUPERADMIN'
                                            ? 'border-yellow-200 bg-yellow-100 text-yellow-800'
                                            : displayRole === 'ADMIN'
                                            ? 'border-purple-200 bg-purple-100 text-purple-700'
                                            : 'border-blue-200 bg-blue-100 text-blue-700'
                                    }`}>
                                        {displayRole}
                                    </span>
                                    {emp.employeeNumber && (
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-500">
                                            #{emp.employeeNumber}
                                        </span>
                                    )}
                                    {emp.jobTitle && (
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-500">
                                            {emp.jobTitle}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                            <div className="flex items-center gap-2"><span aria-hidden="true">📧</span><span>{emp.email}</span></div>
                            {emp.phone && <div className="flex items-center gap-2"><span aria-hidden="true">📞</span><span>{emp.phone}</span></div>}
                            {emp.manager && (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span aria-hidden="true">👤</span>
                                    <span>Manager : {emp.manager.firstName ?? ''} {emp.manager.lastName ?? ''}</span>
                                </div>
                            )}
                        </div>
                    </article>
                )
            })}
        </div>
    )
}

interface PermissionsEditorProps {
    permissions: AdminPermissions
    onToggle: (section: AdminPermissionKey, field: 'enabled' | string, value: boolean) => void
    readOnly?: boolean
}

function PermissionsEditor({ permissions, onToggle, readOnly = false }: PermissionsEditorProps) {
    return (
        <div className="space-y-4">
            {PERMISSION_GROUPED_SECTIONS.map((group) => (
                <section key={group.key} className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">{group.label}</h5>
                    <div className="space-y-3">
                        {group.sections.map(({ key, config }) => {
                            const page = permissions[key]
                            return (
                                <div key={key} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">{config.label}</p>
                                            {config.description && <p className="text-xs text-slate-500">{config.description}</p>}
                                        </div>
                                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={page.enabled}
                                                disabled={readOnly}
                                                onChange={(event) => onToggle(key, 'enabled', event.target.checked)}
                                            />
                                            Accès autorisé
                                        </label>
                                    </div>
                                    {config.actions.length > 0 && (
                                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                                            {config.actions.map((action) => (
                                                <label key={action.key} className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-0.5 h-4 w-4"
                                                        checked={page.enabled && Boolean(page[action.key as keyof typeof page])}
                                                        disabled={readOnly || !page.enabled}
                                                        onChange={(event) => onToggle(key, action.key, event.target.checked)}
                                                    />
                                                    <span>
                                                        <span className="font-semibold text-slate-700">{action.label}</span>
                                                        {action.description && (
                                                            <span className="block text-[11px] text-slate-400">{action.description}</span>
                                                        )}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            ))}
        </div>
    )
}
