'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs')
      const data = await res.json()
      setLogs(data)
    } catch (e) { console.error(e) } 
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">← Retour Tableau de bord</Link>
            <h1 className="text-3xl font-bold text-slate-800">Journal d'Activité 🕵️‍♂️</h1>
            <p className="text-slate-500">Historique des 100 dernières actions sensibles.</p>
          </div>
          <button onClick={fetchLogs} className="bg-white border px-4 py-2 rounded shadow-sm hover:bg-slate-50">Actualiser</button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
              <tr>
                <th className="p-4">Date & Heure</th>
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Action</th>
                <th className="p-4">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center">Chargement...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucune activité récente.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-500 font-mono text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500 border">
                        {log.user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold 
                        ${log.action.includes('DELETE') ? 'bg-red-100 text-red-700' : 
                          log.action.includes('ADD') ? 'bg-green-100 text-green-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-xs">
                      {log.details}
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