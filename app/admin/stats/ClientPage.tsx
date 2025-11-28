"use client"

import { useState, useEffect, useCallback } from "react"
import type React from "react"
import Link from "next/link"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

type TimeRange = "day" | "month" | "year" | "custom"

export default function ClientStatsPage() {
  const [range, setRange] = useState<TimeRange>("month")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customStart, setCustomStart] = useState<string>("")
  const [customEnd, setCustomEnd] = useState<string>("")
  const [appliedStart, setAppliedStart] = useState<string>("")
  const [appliedEnd, setAppliedEnd] = useState<string>("")

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    const now = new Date()
    let start: Date, end: Date

    if (range === "custom" && customStart && customEnd) {
      start = new Date(`${customStart}T00:00:00.000Z`)
      end = new Date(`${customEnd}T23:59:59.999Z`)
    } else if (range === "day") {
      start = startOfDay(now)
      end = endOfDay(now)
    } else if (range === "month") {
      start = startOfMonth(now)
      end = endOfMonth(now)
    } else {
      start = startOfYear(now)
      end = endOfYear(now)
    }

    try {
      const res = await fetch(
        `/api/admin/stats?start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}`
      )

      if (!res.ok) {
        throw new Error(`Erreur API : ${res.status}`)
      }

      const json = await res.json()
      setData(json)
      setAppliedStart(start.toISOString().slice(0,10))
      setAppliedEnd(end.toISOString().slice(0,10))
    } catch (e: any) {
      console.error("Erreur chargement stats:", e)
      setError(e.message || "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }, [range, customStart, customEnd])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(val)

  return (
    <div className="min-h-screen bg-slate-50 p-8 sn-admin">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">
              ← Retour Tableau de bord
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">Statistiques & Performances 📊</h1>
          </div>

        <div className="sn-card p-1 flex">
          <button
            onClick={() => setRange("day")}
            className={`px-4 py-2 text-sm font-bold rounded-md transition ${
              range === "day" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setRange("month")}
            className={`px-4 py-2 text-sm font-bold rounded-md transition ${
              range === "month" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Ce Mois
          </button>
          <button
            onClick={() => setRange("year")}
            className={`px-4 py-2 text-sm font-bold rounded-md transition ${
              range === "year" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Cette Année
          </button>
          <button
            onClick={() => setRange("custom")}
            className={`px-4 py-2 text-sm font-bold rounded-md transition ${
              range === "custom" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Personnalisé
          </button>
        </div>
        <div>
          <button
            onClick={() => window.print()}
            className="text-xs bg-white border px-3 py-1 rounded hover:bg-slate-50 font-bold"
          >
            🖨️ Imprimer / PDF
          </button>
          <button
            onClick={() => exportAccountingCSV(data?.accounting || [])}
            className="ml-2 text-xs bg-white border px-3 py-1 rounded hover:bg-slate-50 font-bold"
          >
            ⬇️ Export CSV
          </button>
        </div>
        </div>

        {/* Print header (visible only on print) */}
        <div className="hidden print:block border border-slate-300 bg-white rounded p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-12 w-auto" />
              <div>
                <div className="text-xl font-bold">Sweet Narcisse</div>
                <div className="text-xs text-slate-600">Comptabilité - Détails des paiements</div>
              </div>
            </div>
            <div className="text-sm text-slate-700">
              Période: {appliedStart || '—'} → {appliedEnd || '—'}
            </div>
          </div>
        </div>

        {/* Custom date range form */}
        {range === 'custom' && (
          <div className="mb-4 sn-card p-4 flex items-end gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Début</label>
              <input type="date" value={customStart} onChange={(e)=> setCustomStart(e.target.value)} className="border p-2 rounded" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Fin</label>
              <input type="date" value={customEnd} onChange={(e)=> setCustomEnd(e.target.value)} className="border p-2 rounded" />
            </div>
            <button onClick={()=> fetchStats()} className="sn-btn-primary h-9 px-4">Appliquer</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400 animate-pulse">Chargement des données...</div>
        ) : error ? (
          <div className="text-center py-20 bg-red-50 text-red-600 rounded-lg border border-red-200">
            <p className="font-bold">Impossible de charger les statistiques.</p>
            <p className="text-sm">{error}</p>
            <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-white border border-red-300 rounded hover:bg-red-50">
              Réessayer
            </button>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="sn-card p-6 border-l-4 border-green-500">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Chiffre d'Affaires</h3>
                <p className="text-4xl font-bold text-slate-800 mt-2">{formatCurrency(data.revenue || 0)}</p>
              </div>
              <div className="sn-card p-6 border-l-4 border-blue-500">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Passagers Totaux</h3>
                <p className="text-4xl font-bold text-slate-800 mt-2">{data.passengers || 0}</p>
              </div>
              <div className="sn-card p-6 border-l-4 border-purple-500">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Réservations</h3>
                <p className="text-4xl font-bold text-slate-800 mt-2">{data.bookingsCount || 0}</p>
              </div>
            </div>

            {/* Breakdown by payment method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="sn-card p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Caisse par mode de paiement</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <BreakdownRow label="Espèces" value={formatCurrency((data.paymentBreakdown?.cash)||0)} />
                  <BreakdownRow label="Carte bancaire" value={formatCurrency((data.paymentBreakdown?.card)||0)} />
                  <BreakdownRow label="PayPal" value={formatCurrency((data.paymentBreakdown?.paypal)||0)} />
                  <BreakdownRow label="Apple Pay" value={formatCurrency((data.paymentBreakdown?.applepay)||0)} />
                  <BreakdownRow label="Google Pay" value={formatCurrency((data.paymentBreakdown?.googlepay)||0)} />
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  Note: ANCV et City Pass ne sont pas inclus dans la caisse.
                </div>
              </div>
              <div className="sn-card p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Vouchers (hors caisse)</h3>
                <div className="text-xs text-slate-500 mb-5">Comptés en nombre, pas en €</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <BreakdownRow label="ANCV (nombre)" value={`${(data.paymentBreakdown?.ANCV)||0}`} />
                  <BreakdownRow label="City Pass (nombre)" value={`${(data.paymentBreakdown?.CityPass)||0}`} />
                </div>
                <div className="mt-3 text-xs text-slate-500">Règle City Pass: enfants inclus avec l'adulte ; compteur = nombre d'adultes par réservation.</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <KPI title="No-Show" value={data.noShow || 0} />
              <KPI title="Annulés" value={data.cancelled || 0} />
              <KPI title="Panier moy." value={data.avgPerBooking || 0} />
              <KPI title="€/pers." value={data.avgPerPerson || 0} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="sn-card p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Langues demandées 🌍</h3>
                <div className="space-y-4">
                  {(data.byLanguage || []).map((l: any) => {
                    const total = data.bookingsCount || 1
                    const percent = Math.round((l._count.id / total) * 100)
                    return (
                      <div key={l.language}>
                        <div className="flex justify-between text-sm font-bold mb-1">
                          <span>{l.language}</span>
                          <span>
                            {percent}% ({l._count.id})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              l.language === 'FR' ? 'bg-blue-500' : l.language === 'EN' ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                  {(!data.byLanguage || data.byLanguage.length === 0) && (
                    <div className="text-slate-400 text-sm text-center italic">Aucune donnée linguistique.</div>
                  )}
                </div>
              </div>

              <div className="sn-card p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Par statut</h3>
                <Bar data={toBarData(data.statusDist || {})} />
              </div>
            </div>

            <Section title="Par jour (mois)">
              <Line data={toLineData(data.seriesDaily || [])} />
            </Section>
            <Section title="Par heure">
              <Bar data={toHourBar(data.byHour || [])} />
            </Section>

            <Section title="Comptabilité (détails imprimables)">
              <AccountingTable items={data.accounting || []} formatCurrency={formatCurrency} />
              <TotalsSummary paymentBreakdown={data.paymentBreakdown || {}} formatCurrency={formatCurrency} />
            </Section>
          </>
        ) : null}
      </div>
    </div>
  )
}

function KPI({ title, value }: { title: string; value: number }) {
  return (
    <div className="p-4 bg-white border rounded shadow-sm">
      <div className="text-xs text-slate-500 font-bold uppercase">{title}</div>
      <div className="text-2xl font-bold text-blue-900">{value}</div>
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-slate-600 mb-2">{title}</h3>
      <div className="p-4 sn-card">{children}</div>
    </div>
  )
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  )
}

function Bar({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid grid-cols-6 gap-2 items-end h-40">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center">
          <div className="w-6 bg-blue-600" style={{ height: `${Math.max(4, d.value)}px` }} />
          <div className="text-[10px] mt-1 text-center break-words">{d.label}</div>
          <div className="text-[10px] text-slate-500">{d.value}</div>
        </div>
      ))}
    </div>
  )
}

function Line({ data }: { data: Array<{ date: string; bookings: number; revenue: number }> }) {
  return (
    <div className="h-40 relative">
      <svg className="absolute inset-0 w-full h-full">
        {(() => {
          if (!data.length) return null
          const max = Math.max(...data.map((d) => d.bookings)) || 1
          const points = data
            .map((d, i) => {
              const x = (i / Math.max(1, data.length - 1)) * 100
              const y = 100 - (d.bookings / max) * 100
              return `${x},${y}`
            })
            .join(" ")
          return <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" />
        })()}
      </svg>
      <div className="grid grid-cols-6 text-[10px] absolute bottom-0 w-full">
        {data.slice(0, 6).map((d) => (
          <div key={d.date} className="truncate">
            {d.date.slice(8, 10)}
          </div>
        ))}
      </div>
    </div>
  )
}

function toBarData(obj: Record<string, number>) {
  return Object.entries(obj).map(([label, value]) => ({ label, value }))
}

function toLineData(arr: Array<{ date: string; bookings: number; revenue: number }>) {
  return arr
}

function toHourBar(arr: Array<{ hour: string; count: number; revenue: number }>) {
  return arr.map((a) => ({ label: a.hour, value: a.count }))
}

function AccountingTable({ items, formatCurrency }: { items: Array<{ bookingId: string; boat?: string; date: string; time: string; name: string; people: number; amount: number; method: string }>; formatCurrency: (n:number)=>string }) {
  if (!items.length) {
    return <div className="text-slate-400 text-sm italic">Aucune ligne de paiement sur la période.</div>
  }
  const grandTotal = items.reduce((s,it)=> s + (it.amount||0), 0)
  const grandPeople = items.reduce((s,it)=> s + (it.people||0), 0)
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 font-bold border-b dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          <tr>
            <th className="p-2 text-left">Booking</th>
            <th className="p-2 text-left">Bateau</th>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Heure</th>
            <th className="p-2 text-left">Client</th>
            <th className="p-2 text-right">Pers.</th>
            <th className="p-2 text-right">Montant</th>
            <th className="p-2 text-left">Mode</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-700">
          {(() => {
            const rows: React.ReactElement[] = []
            let currentDate = ''
            let dayPeople = 0
            let dayTotal = 0
            const flushSubtotal = () => {
              if (!currentDate) return
              rows.push(
                <tr key={`subtotal-${currentDate}`} className="bg-slate-50 font-bold">
                  <td className="p-2">Sous-total</td>
                  <td className="p-2"></td>
                  <td className="p-2">{currentDate}</td>
                  <td className="p-2"></td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right">{dayPeople}</td>
                  <td className="p-2 text-right">{formatCurrency(dayTotal)}</td>
                  <td className="p-2"></td>
                </tr>
              )
            }
            items.forEach((it, idx) => {
              if (it.date !== currentDate) {
                // new day begins; flush previous subtotal
                if (currentDate) flushSubtotal()
                currentDate = it.date
                dayPeople = 0
                dayTotal = 0
              }
              dayPeople += (it.people||0)
              dayTotal += (it.amount||0)
              rows.push(
                <tr key={idx}>
                  <td className="p-2">{it.bookingId}</td>
                  <td className="p-2">{it.boat || '-'}</td>
                  <td className="p-2">{it.date}</td>
                  <td className="p-2">{it.time}</td>
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 text-right">{it.people}</td>
                  <td className="p-2 text-right">{formatCurrency(it.amount)}</td>
                  <td className="p-2">{it.method}</td>
                </tr>
              )
              if (idx === items.length - 1) {
                flushSubtotal()
              }
            })
            return rows
          })()}
        </tbody>
        <tfoot>
          <tr className="border-t font-bold bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
            <td className="p-2">TOTAL</td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2 text-right">{grandPeople}</td>
            <td className="p-2 text-right">{formatCurrency(grandTotal)}</td>
            <td className="p-2"></td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-2 text-xs text-slate-500">Astuce: utilisez le bouton Imprimer pour sauvegarder en PDF.</div>
    </div>
  )
}

function exportAccountingCSV(items: Array<{ bookingId: string; boat?: string; date: string; time: string; name: string; people: number; amount: number; method: string }>) {
  if (!items?.length) return
  const headers = ['BookingId','Boat','Date','Time','Client','People','AmountEUR','Method']
  const escape = (s: any) => {
    const str = String(s ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }
  const rows = [headers.join(',')]
  for (const it of items) {
    rows.push([
      escape(it.bookingId),
      escape(it.boat || ''),
      escape(it.date),
      escape(it.time),
      escape(it.name),
      it.people,
      (it.amount ?? 0).toFixed(2),
      escape(it.method)
    ].join(','))
  }
  // Totals
  const grandPeople = items.reduce((s,it)=> s+(it.people||0), 0)
  const grandTotal = items.reduce((s,it)=> s+(it.amount||0), 0)
  const byMethod: Record<string, number> = {}
  for (const it of items) {
    byMethod[it.method] = (byMethod[it.method]||0) + (it.amount||0)
  }
  rows.push('')
  rows.push(['TOTAL','','','','', grandPeople, grandTotal.toFixed(2), ''].join(','))
  for (const [method, amount] of Object.entries(byMethod)) {
    rows.push([`TOTAL_${method}`,'','','','', '', amount.toFixed(2), method].join(','))
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `accounting_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function TotalsSummary({ paymentBreakdown, formatCurrency }: { paymentBreakdown: any; formatCurrency: (n:number)=>string }) {
  const caisse = (paymentBreakdown.cash||0) + (paymentBreakdown.card||0) + (paymentBreakdown.paypal||0) + (paymentBreakdown.applepay||0) + (paymentBreakdown.googlepay||0)
  const vouchersCount = (paymentBreakdown.ANCV||0) + (paymentBreakdown.CityPass||0)
  return (
    <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-4">
      <div className="text-xs text-slate-600 font-bold uppercase mb-2">Totaux</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <BreakdownRow label="Caisse (incl. CB/PayPal/Apple/Google)" value={formatCurrency(caisse)} />
        <BreakdownRow label="Vouchers (ANCV + City Pass)" value={`${vouchersCount}`} />
        <BreakdownRow label="Espèces" value={formatCurrency(paymentBreakdown.cash||0)} />
        <BreakdownRow label="Carte bancaire" value={formatCurrency(paymentBreakdown.card||0)} />
        <BreakdownRow label="PayPal" value={formatCurrency(paymentBreakdown.paypal||0)} />
        <BreakdownRow label="Apple Pay" value={formatCurrency(paymentBreakdown.applepay||0)} />
        <BreakdownRow label="Google Pay" value={formatCurrency(paymentBreakdown.googlepay||0)} />
        <BreakdownRow label="ANCV (nombre)" value={`${paymentBreakdown.ANCV||0}`} />
        <BreakdownRow label="City Pass (nombre)" value={`${paymentBreakdown.CityPass||0}`} />
      </div>
    </div>
  )
}
