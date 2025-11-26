'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function HoursPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [report, setReport] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    userId: '',
    date: new Date().toISOString().slice(0, 10),
    start: '08:00',
    end: '17:00',
    breakTime: '01:00', // <--- Format HH:MM
    note: ''
  })

  // Utilitaire : Convertir HH:MM en minutes pour l'API
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.split(':').map(Number)
    return (hours * 60) + minutes
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/hours?month=${currentMonth}`)
      const data = await res.json()
      setReport(data)
      setEmployees(data.map((r: any) => r.user))
      if(data.length > 0 && !form.userId) setForm(prev => ({ ...prev, userId: data[0].user.id }))
    } catch (e) { console.error(e) } 
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [currentMonth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Conversion avant envoi
    const breakInMinutes = timeToMinutes(form.breakTime)

    try {
      const res = await fetch('/api/admin/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...form,
            breakTime: breakInMinutes // On envoie le nombre entier à l'API
        })
      })
      if (res.ok) {
        fetchData()
        alert("✅ Shift ajouté avec succès !")
      } else {
        const err = await res.json()
        alert("❌ Erreur : " + err.error)
      }
    } catch (e) { alert("Erreur technique") }
  }

    // Affichage "mur du temps" en UTC explicite (évite décalage)
    const formatWallDate = (iso: string) => {
        const d = new Date(iso)
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const day = String(d.getUTCDate()).padStart(2, '0')
        return `${day}/${m}/${y}`
    }

    const formatWallTime = (iso: string) => {
        const d = new Date(iso)
        const hh = String(d.getUTCHours()).padStart(2, '0')
        const mm = String(d.getUTCMinutes()).padStart(2, '0')
        return `${hh}:${mm}`
    }

  return (
    <div className="min-h-screen bg-slate-50 p-8 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">← Retour</Link>
            <h1 className="text-3xl font-bold text-slate-800">Pointage & Paie 🕒</h1>
          </div>
          <div className="flex items-center gap-4">
            <div>
                <label className="text-xs font-bold uppercase text-slate-500 mr-2">Période :</label>
                <input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)}
                    className="border p-2 rounded shadow-sm font-bold text-slate-700"/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
            
            <div className="lg:col-span-1 print:hidden">
                <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 sticky top-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Saisir une journée</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Employé</label>
                            <select className="w-full p-2 border rounded bg-slate-50 font-medium"
                                value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                            <input type="date" className="w-full p-2 border rounded" 
                                value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Début</label>
                                <input type="time" className="w-full p-2 border rounded" 
                                    value={form.start} onChange={e => setForm({...form, start: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Fin</label>
                                <input type="time" className="w-full p-2 border rounded" 
                                    value={form.end} onChange={e => setForm({...form, end: e.target.value})} required />
                            </div>
                        </div>

                        {/* CHANGEMENT ICI : TYPE TIME */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pause (HH:mm)</label>
                            <input type="time" className="w-full p-2 border rounded" 
                                value={form.breakTime} onChange={e => setForm({...form, breakTime: e.target.value})} required />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Note (Optionnel)</label>
                            <input type="text" placeholder="Ex: Remplacement..." className="w-full p-2 border rounded" 
                                value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
                        </div>

                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">
                            Enregistrer le pointage
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 print:shadow-none print:border-none">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center print:bg-white print:border-black">
                        <h3 className="font-bold text-slate-700 text-lg">Rapport d'Heures - {currentMonth}</h3>
                        <button onClick={() => window.print()} className="text-xs bg-white border px-3 py-1 rounded hover:bg-slate-100 print:hidden font-bold">
                            🖨️ Imprimer
                        </button>
                    </div>
                    
                    {loading ? <div className="p-8 text-center text-slate-400">Calcul en cours...</div> : (
                        <div className="p-4 space-y-8">
                            {report.map((row) => (
                                <div key={row.user.id} className="border rounded-lg overflow-hidden print:border-black mb-6 break-inside-avoid">
                                    <div className="bg-slate-100 p-3 flex justify-between items-center print:bg-slate-200">
                                        <div className="font-bold text-slate-900">
                                            {row.user.firstName} {row.user.lastName.toUpperCase()}
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-slate-500 mr-2">{row.shiftsCount} jours</span>
                                            <span className="bg-blue-600 text-white px-2 py-1 rounded font-bold print:text-black print:border print:border-black print:bg-white">
                                                Total : {row.totalHours} h
                                            </span>
                                        </div>
                                    </div>

                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-normal text-xs uppercase border-b">
                                            <tr>
                                                <th className="p-2 pl-4">Date</th>
                                                <th className="p-2">Horaires</th>
                                                <th className="p-2">Pause</th>
                                                <th className="p-2 text-right pr-4">Total Net</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {row.details.length === 0 ? (
                                                <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Aucune heure saisie ce mois-ci.</td></tr>
                                            ) : (
                                                row.details
                                                .sort((a:any,b:any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                                .map((shift:any) => {
                                                    const rawMin = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 60000
                                                    const netH = Math.max(0, (rawMin - shift.breakMinutes) / 60).toFixed(2)
                                                    
                                                    return (
                                                        <tr key={shift.id}>
                                                            <td className="p-2 pl-4 font-medium">
                                                                {formatWallDate(shift.startTime)}
                                                            </td>
                                                            <td className="p-2 text-slate-600">
                                                                {formatWallTime(shift.startTime)} - {formatWallTime(shift.endTime)}
                                                            </td>
                                                            <td className="p-2 text-slate-500 italic">
                                                                {/* Affichage propre de la pause */}
                                                                {shift.breakMinutes > 0 
                                                                    ? `-${Math.floor(shift.breakMinutes/60)}h${(shift.breakMinutes%60).toString().padStart(2,'0')}` 
                                                                    : '-'}
                                                            </td>
                                                            <td className="p-2 pr-4 text-right font-bold text-slate-700">
                                                                {netH} h
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}