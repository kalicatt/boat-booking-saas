'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [myRole, setMyRole] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)

    const isSuperAdmin = myRole === 'SUPERADMIN'
    const [form, setForm] = useState<any>({
        firstName: '', lastName: '', email: '', phone: '', address: '', city: '', postalCode: '', country: '',
        dateOfBirth: '', gender: '', employeeNumber: '', hireDate: '', department: '', jobTitle: '', managerId: '',
        employmentStatus: 'ACTIVE', fullTime: true, hourlyRate: '', salary: '', emergencyContactName: '', emergencyContactPhone: '',
        notes: '', password: '', role: 'EMPLOYEE'
    })

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
                const me = await meRes.json()
                setMyRole(me?.user?.role || '')
                const res = await fetch('/api/admin/employees', { credentials: 'include', cache: 'no-store' })
                const data = await res.json()
                setEmployees(data || [])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    async function handleSubmit(e: any) {
        e.preventDefault()
        const method = 'POST'
        const res = await fetch('/api/admin/employees', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        if (res.ok) {
            const created = await res.json()
            setEmployees((prev) => [created, ...prev])
            setForm({
                firstName: '', lastName: '', email: '', phone: '', address: '', city: '', postalCode: '', country: '',
                dateOfBirth: '', gender: '', employeeNumber: '', hireDate: '', department: '', jobTitle: '', managerId: '',
                employmentStatus: 'ACTIVE', fullTime: true, hourlyRate: '', salary: '', emergencyContactName: '', emergencyContactPhone: '',
                notes: '', password: '', role: 'EMPLOYEE'
            })
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Supprimer ${name} ?`)) return
        const res = await fetch(`/api/admin/employees?id=${id}`, { method: 'DELETE' })
        if (res.ok) setEmployees((prev) => prev.filter(e => e.id !== id))
    }

    const canManage = myRole === 'SUPERADMIN' || myRole === 'ADMIN'

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="text-slate-600 hover:text-slate-800">← Retour Tableau de bord</Link>
                    {!canManage && !loading && (
                        <p className="text-sm text-orange-600 mt-1 font-bold bg-orange-50 inline-block px-2 py-1 rounded border border-orange-200">
                            🔒 Mode Lecture Seule
                        </p>
                    )}
                </div>
                {canManage && (
                    <button onClick={()=>setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm">+ Nouveau collaborateur</button>
                )}
            </div>

            <CreateEmployeeModal
                open={showCreateModal}
                onClose={()=>setShowCreateModal(false)}
                onSubmit={(e:any)=>{handleSubmit(e); setShowCreateModal(false)}}
                form={form}
                setForm={setForm}
                myRole={myRole}
            />

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                            <tr>
                                <th className="p-4">Identité</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={3} className="p-8 text-center">Chargement...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={3} className="p-8 text-center">Aucun collaborateur.</td></tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="transition hover:bg-slate-50">
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-slate-800 text-lg">
                                                {emp.firstName} {emp.lastName}
                                            </div>
                                            <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-bold border 
                                                ${emp.role === 'SUPERADMIN' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                                    emp.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                                    'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600 align-top">
                                            <div className="mb-1">📧 {emp.email}</div>
                                            <div className="mb-1">📞 {emp.phone || '-'}</div>
                                            <div className="text-xs text-slate-400">🏠 {emp.address || '-'}</div>
                                            {isSuperAdmin && (
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {emp.hourlyRate ? `💶 ${emp.hourlyRate}€/h` : ''}
                                                    {emp.annualSalary ? ` · 💼 ${emp.annualSalary}€/an` : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right align-top space-x-2">
                                            {isSuperAdmin && emp.role !== 'SUPERADMIN' && (
                                                <>
                                                    <button 
                                                        onClick={() => alert('Édition à venir')}
                                                        className="text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded font-bold text-xs border border-blue-200"
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(emp.id, emp.firstName)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded font-bold text-xs border border-red-200"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// Modal de création rapide
function CreateEmployeeModal({ open, onClose, onSubmit, form, setForm, myRole }: any) {
    if (!open) return null
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
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">N° Employé</label>
                            <input className="w-full p-2 border rounded" value={form.employeeNumber || ''} onChange={e=>setForm({...form, employeeNumber: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date d'embauche</label>
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
                            <label className="block text-xs font-bold text-slate-500 mb-1">Manager ID</label>
                            <input className="w-full p-2 border rounded" value={form.managerId || ''} onChange={e=>setForm({...form, managerId: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Statut</label>
                            <select className="w-full p-2 border rounded bg-white" value={form.employmentStatus || 'ACTIVE'} onChange={e=>setForm({...form, employmentStatus: e.target.value})}>
                                <option value="ACTIVE">Actif</option>
                                <option value="ON_LEAVE">En congé</option>
                                <option value="TERMINATED">Sorti</option>
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                                <input type="checkbox" checked={!!form.fullTime} onChange={e=>setForm({...form, fullTime: e.target.checked})} />
                                Temps plein
                            </label>
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