'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [myRole, setMyRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  // État pour savoir si on est en mode ÉDITION
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
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
        employeeNumber: '',
        hireDate: '',
        department: '',
        jobTitle: '',
        managerId: '',
        employmentStatus: 'PERMANENT',
        isFullTime: true,
        hourlyRate: '',
        annualSalary: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        notes: '',
    password: '',
    role: 'EMPLOYEE'
  })

  const initPage = async () => {
    setLoading(true)
    try {
      const resMe = await fetch('/api/auth/me')
      const dataMe = await resMe.json()
      setMyRole(dataMe.role)

      const resEmp = await fetch('/api/admin/employees')
      const dataEmp = await resEmp.json()
      if (Array.isArray(dataEmp)) setEmployees(dataEmp)
      else setEmployees([])
    } catch (e) { console.error(e) } 
    finally { setLoading(false) }
  }

  useEffect(() => { initPage() }, [])

  // --- FONCTIONS ---

  // Remplir le formulaire avec les données de l'employé
  const handleEditClick = (emp: any) => {
    setEditingId(emp.id)
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || '',
      address: emp.address || '',
            city: emp.city || '',
            postalCode: emp.postalCode || '',
            country: emp.country || '',
            dateOfBirth: emp.dateOfBirth ? String(emp.dateOfBirth).slice(0,10) : '',
            gender: emp.gender || '',
            employeeNumber: emp.employeeNumber || '',
            hireDate: emp.hireDate ? String(emp.hireDate).slice(0,10) : '',
            department: emp.department || '',
            jobTitle: emp.jobTitle || '',
            managerId: emp.managerId || '',
            employmentStatus: emp.employmentStatus || 'PERMANENT',
            isFullTime: emp.isFullTime ?? true,
            hourlyRate: emp.hourlyRate?.toString() || '',
            annualSalary: emp.annualSalary?.toString() || '',
            emergencyContactName: emp.emergencyContactName || '',
            emergencyContactPhone: emp.emergencyContactPhone || '',
            notes: emp.notes || '',
      password: '', // On vide le mot de passe par sécurité (laisser vide = ne pas changer)
      role: emp.role
    })
    // Scroll vers le formulaire (utile sur mobile)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingId(null)
        setForm({ firstName: '', lastName: '', email: '', phone: '', address: '', city: '', postalCode: '', country: '', dateOfBirth: '', gender: '', employeeNumber: '', hireDate: '', department: '', jobTitle: '', managerId: '', employmentStatus: 'PERMANENT', isFullTime: true, hourlyRate: '', annualSalary: '', emergencyContactName: '', emergencyContactPhone: '', notes: '', password: '', role: 'EMPLOYEE' })
  }

  // Soumission (Gère CREATE et UPDATE)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isEdit = !!editingId
    const message = isEdit ? "Confirmer la modification ?" : "Confirmer la création ?"
    if (!confirm(message)) return

    try {
      const url = '/api/admin/employees'
      const method = isEdit ? 'PUT' : 'POST'
      
      // Si édition, on ajoute l'ID dans le corps
      const body = isEdit ? { ...form, id: editingId } : form

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        alert(isEdit ? "Modifications enregistrées !" : "Compte créé !")
        handleCancelEdit() // Reset du formulaire
        initPage() // Recharger la liste
      } else {
        const err = await res.json()
        alert("Erreur : " + err.error)
      }
    } catch (e) { alert("Erreur technique") }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return
    try {
      const res = await fetch(`/api/admin/employees?id=${id}`, { method: 'DELETE' })
      if (res.ok) initPage()
      else alert("Erreur suppression")
    } catch (e) { alert("Erreur technique") }
  }

  const isSuperAdmin = myRole === 'SUPERADMIN'

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">← Retour Tableau de bord</Link>
            <h1 className="text-3xl font-bold text-slate-800">Annuaire Entreprise 👥</h1>
            {!isSuperAdmin && !loading && (
                <p className="text-sm text-orange-600 mt-1 font-bold bg-orange-50 inline-block px-2 py-1 rounded border border-orange-200">
                    🔒 Mode Lecture Seule
                </p>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-8 ${isSuperAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
            
            {/* FORMULAIRE (Création / Édition) */}
            {isSuperAdmin && (
            <div className="lg:col-span-1">
                <div className={`p-6 rounded-xl shadow-md border sticky top-8 transition-colors 
                    ${editingId ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                    
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-slate-800">
                            {editingId ? "Modifier la fiche" : "Nouveau Collaborateur"}
                        </h3>
                        {editingId && (
                            <button onClick={handleCancelEdit} className="text-xs text-slate-500 underline hover:text-slate-800">
                                Annuler
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Prénom</label>
                                <input required type="text" className="w-full p-2 border rounded bg-white" 
                                    value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nom</label>
                                <input required type="text" className="w-full p-2 border rounded bg-white" 
                                    value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                            <input required type="email" className="w-full p-2 border rounded bg-white" 
                                value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Téléphone</label>
                            <input required type="tel" className="w-full p-2 border rounded bg-white" 
                                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Adresse</label>
                            <textarea className="w-full p-2 border rounded bg-white text-sm" rows={2}
                                value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                        </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Ville</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.city} onChange={e=>setForm({...form, city: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Code Postal</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.postalCode} onChange={e=>setForm({...form, postalCode: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Pays</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.country} onChange={e=>setForm({...form, country: e.target.value})} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Date de Naissance</label>
                                                        <input type="date" className="w-full p-2 border rounded bg-white" value={form.dateOfBirth} onChange={e=>setForm({...form, dateOfBirth: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Sexe</label>
                                                        <select className="w-full p-2 border rounded bg-white" value={form.gender} onChange={e=>setForm({...form, gender: e.target.value})}>
                                                            <option value="">—</option>
                                                            <option value="Homme">Homme</option>
                                                            <option value="Femme">Femme</option>
                                                            <option value="Autre">Autre</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">N° Employé</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.employeeNumber} onChange={e=>setForm({...form, employeeNumber: e.target.value})} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Date d'embauche</label>
                                                        <input type="date" className="w-full p-2 border rounded bg-white" value={form.hireDate} onChange={e=>setForm({...form, hireDate: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Département</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.department} onChange={e=>setForm({...form, department: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Poste</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.jobTitle} onChange={e=>setForm({...form, jobTitle: e.target.value})} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Manager ID</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.managerId} onChange={e=>setForm({...form, managerId: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Statut</label>
                                                        <select className="w-full p-2 border rounded bg-white" value={form.employmentStatus} onChange={e=>setForm({...form, employmentStatus: e.target.value})}>
                                                            <option value="PERMANENT">Permanent</option>
                                                            <option value="TEMPORARY">Temporaire</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input type="checkbox" checked={form.isFullTime} onChange={e=>setForm({...form, isFullTime: e.target.checked})} />
                                                        <label className="text-xs font-bold text-slate-500">Temps plein</label>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Taux horaire (€)</label>
                                                        <input type="number" step="0.01" className="w-full p-2 border rounded bg-white" value={form.hourlyRate} onChange={e=>setForm({...form, hourlyRate: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Salaire annuel (€)</label>
                                                        <input type="number" step="0.01" className="w-full p-2 border rounded bg-white" value={form.annualSalary} onChange={e=>setForm({...form, annualSalary: e.target.value})} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Contact Urgence - Nom</label>
                                                        <input type="text" className="w-full p-2 border rounded bg-white" value={form.emergencyContactName} onChange={e=>setForm({...form, emergencyContactName: e.target.value})} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1">Contact Urgence - Téléphone</label>
                                                        <input type="tel" className="w-full p-2 border rounded bg-white" value={form.emergencyContactPhone} onChange={e=>setForm({...form, emergencyContactPhone: e.target.value})} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
                                                    <textarea className="w-full p-2 border rounded bg-white text-sm" rows={3}
                                                        value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} />
                                                </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                                {editingId ? "Nouveau mot de passe (Laisser vide pour garder)" : "Mot de passe provisoire"}
                            </label>
                            <input type="text" className="w-full p-2 border rounded bg-white" 
                                placeholder={editingId ? "Ne pas changer" : "Ex: pass123"}
                                value={form.password} onChange={e => setForm({...form, password: e.target.value})} 
                                required={!editingId} // Obligatoire seulement à la création
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Rôle</label>
                            <select className="w-full p-2 border rounded bg-white"
                                value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                                <option value="EMPLOYEE">Employé</option>
                                <option value="ADMIN">Administrateur</option>
                            </select>
                        </div>

                        <button type="submit" className={`w-full text-white py-3 rounded-lg font-bold transition shadow-sm 
                            ${editingId ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {editingId ? "Enregistrer les modifications" : "Créer le compte"}
                        </button>
                    </form>
                </div>
            </div>
            )}

            {/* LISTE DES EMPLOYÉS */}
            <div className={isSuperAdmin ? 'lg:col-span-2' : 'lg:col-span-1'}>
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
                                    <tr key={emp.id} className={`transition ${editingId === emp.id ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}>
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
                                            <div className="mb-1">📞 {emp.phone || "-"}</div>
                                            <div className="text-xs text-slate-400">🏠 {emp.address || "-"}</div>
                                        </td>
                                        <td className="p-4 text-right align-top space-x-2">
                                            {isSuperAdmin && emp.role !== 'SUPERADMIN' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleEditClick(emp)}
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
      </div>
    </div>
  )
}