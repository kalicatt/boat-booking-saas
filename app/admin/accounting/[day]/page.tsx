"use client"
import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { business } from '@/lib/business'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

type PaymentLedgerDto = {
  id: string
  eventType: string
  provider: string
  methodType: string | null
  amount: number
  currency: string
  bookingId: string | null
  receiptNo: number | null
  occurredAt: string
  note?: string | null
  paymentId?: string | null
}

type DailyClosureDto = {
  id: string
  day: string
  closedAt: string | null
  closedById: string | null
  totalsJson: string
  hash: string
  locked: boolean
}

type ClosureSnapshot = {
  totals: Record<string, number>
  vouchers: Record<string, number>
  vat?: { net?: number; vat?: number; gross?: number }
}

const toArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>
    if (Array.isArray(candidate.items)) return candidate.items as T[]
    if (Array.isArray(candidate.data)) return candidate.data as T[]
  }
  return []
}

const parseClosureSnapshot = (payload: unknown): ClosureSnapshot | null => {
  if (typeof payload !== 'string') return null
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    const totals = Object.entries(parsed.totals ?? {}).reduce<Record<string, number>>((acc, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) acc[key] = value
      return acc
    }, {})
    const vouchers = Object.entries(parsed.vouchers ?? {}).reduce<Record<string, number>>((acc, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) acc[key] = value
      return acc
    }, {})
    const snapshot: ClosureSnapshot = { totals, vouchers }
    if (parsed.vat && typeof parsed.vat === 'object' && parsed.vat !== null) {
      const vat = parsed.vat as Record<string, unknown>
      snapshot.vat = {
        net: typeof vat.net === 'number' ? vat.net : undefined,
        vat: typeof vat.vat === 'number' ? vat.vat : undefined,
        gross: typeof vat.gross === 'number' ? vat.gross : undefined
      }
    }
    return snapshot
  } catch {
    return null
  }
}

const formatEuro = (value: number) => `${(value / 100).toFixed(2)} €`

const parseEuroInput = (value: string) => {
  const normalized = value.replace(/\s+/g, '').replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed * 100)
}

const joinWithEt = (items: string[]) => {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} et ${items[1]}`
  const last = items[items.length - 1]
  return `${items.slice(0, -1).join(', ')} et ${last}`
}

const PRIMARY_PROVIDERS = ['stripe_terminal', 'card', 'cash', 'voucher', 'check']

export default function ClosureDetailPage({ params }: { params: { day: string } }){
  const dayParam = params.day // expected format yyyy-MM-dd
  const { data: closures } = useSWR('/api/admin/closures', fetcher)
  const { data: ledger } = useSWR('/api/admin/ledger', fetcher)

  const closuresList = toArray<DailyClosureDto>(closures)
  const ledgerEntries = toArray<PaymentLedgerDto>(ledger)
  const [cashCountInput, setCashCountInput] = useState('')
  const [otherConfirmations, setOtherConfirmations] = useState<Record<string, boolean>>({})

  const closure = useMemo(()=>{
    return closuresList.find((item)=> format(new Date(item.day), 'yyyy-MM-dd') === dayParam) || null
  }, [closuresList, dayParam])

  const entriesForDay = useMemo(()=>{
    return ledgerEntries.filter((entry)=> format(new Date(entry.occurredAt), 'yyyy-MM-dd') === dayParam)
  }, [ledgerEntries, dayParam])

  const providerTotals = useMemo(() => {
    return entriesForDay.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.provider] = (acc[entry.provider] ?? 0) + entry.amount
      return acc
    }, {})
  }, [entriesForDay])

  const voucherBreakdown = useMemo(() => {
    return entriesForDay
      .filter((entry) => entry.provider === 'voucher')
      .reduce<Record<string, number>>((acc, entry) => {
        const key = entry.methodType && entry.methodType.trim().length > 0 ? entry.methodType : 'Sans libellé'
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {})
  }, [entriesForDay])

  const checkEntries = useMemo(() => entriesForDay.filter((entry) => entry.provider === 'check'), [entriesForDay])

  const cardTotal = (providerTotals.stripe_terminal ?? 0) + (providerTotals.card ?? 0)
  const cashExpected = providerTotals.cash ?? 0
  const parsedCashCount = parseEuroInput(cashCountInput)
  const cashDiff = parsedCashCount === null ? null : parsedCashCount - cashExpected
  const cashDiffDisplay = cashDiff === null ? '—' : `${cashDiff > 0 ? '+' : ''}${formatEuro(cashDiff)}`
  const cashDiffTone = cashDiff === null ? 'text-slate-500' : cashDiff === 0 ? 'text-emerald-600' : 'text-rose-600'

  const voucherInstruction = (() => {
    const parts = Object.entries(voucherBreakdown).map(([label, count]) =>
      `${count} bon${count > 1 ? 's' : ''} "${label}"`
    )
    if (parts.length === 0) {
      return 'Aucun bon enregistré pour cette journée.'
    }
    return `Vérifiez que vous avez ${joinWithEt(parts)}.`
  })()

  const checkInstruction = (() => {
    if (checkEntries.length === 0) {
      return 'Aucun chèque enregistré aujourd’hui.'
    }
    const descriptors = checkEntries.map((entry) => {
      const baseLabel = entry.note && entry.note.trim().length > 0
        ? entry.note
        : entry.paymentId ?? entry.receiptNo?.toString() ?? entry.id.slice(0, 6)
      return `N°${baseLabel} (${formatEuro(entry.amount)})`
    })
    return `Vérifiez les ${checkEntries.length} chèques : ${joinWithEt(descriptors)}.`
  })()

  const otherProviders = useMemo(
    () =>
      Object.entries(providerTotals)
        .filter(([provider]) => !PRIMARY_PROVIDERS.includes(provider))
        .map(([provider, amount]) => ({ provider, amount })),
    [providerTotals]
  )

  if (!closure) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Clôture {dayParam}</h1>
        <p className="mt-2 text-sm">Aucune clôture enregistrée pour cette date.</p>
      </div>
    )
  }

  const snapshot = parseClosureSnapshot(closure.totalsJson) ?? { totals: {}, vouchers: {} }

  return (
    <div className="p-6 space-y-6">
      {/* Print header (appears only in print) */}
      <div className="print-only">
        <div style={{ textAlign:'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{business.name}</div>
          <div style={{ fontSize: '12px' }}>{business.address} • Tél. {business.phone}</div>
          <div style={{ fontSize: '12px' }}>N° SIRET : {business.siret}</div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px' }}>
          <div>Date: {format(new Date(closure.day),'dd/MM/yyyy')}</div>
          <div>Hash: {closure.hash.slice(0,12)}…</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clôture du {format(new Date(closure.day),'dd/MM/yyyy')}</h1>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-1 no-print" onClick={()=> window.print()}>Imprimer</button>
          <button className="border rounded px-3 py-1 no-print" onClick={()=>{
            const snap = parseClosureSnapshot(closure.totalsJson) ?? { totals: {}, vouchers: {}, vat: undefined }
            const rows: string[][] = []
            rows.push(['Entreprise', business.name])
            rows.push(['Adresse', business.address])
            rows.push(['Téléphone', business.phone])
            rows.push(['SIRET', business.siret])
            rows.push([])
            rows.push(['Date', format(new Date(closure.day),'yyyy-MM-dd')])
            rows.push(['Hash', closure.hash])
            rows.push(['Totaux', ...Object.entries(snap.totals).map(([key,value])=> `${key}:${(value/100).toFixed(2)}€`)] )
            rows.push(['Vouchers', ...Object.entries(snap.vouchers).map(([key,value])=> `${key}:${value}`)])
            rows.push(['TVA', `Net:${((snap.vat?.net ?? 0)/100).toFixed(2)}€`, `TVA:${((snap.vat?.vat ?? 0)/100).toFixed(2)}€`, `Brut:${((snap.vat?.gross ?? 0)/100).toFixed(2)}€`])
            rows.push([])
            rows.push(['Heure','Reçu','Type','Provider','Méthode','Montant','Devise','Réservation'])
            for (const entry of entriesForDay){
              rows.push([
                format(new Date(entry.occurredAt),'HH:mm'),
                entry.receiptNo ? `${new Date(entry.occurredAt).getUTCFullYear()}-${String(entry.receiptNo).padStart(6,'0')}` : '',
                entry.eventType,
                entry.provider,
                entry.methodType || '',
                (entry.amount/100).toFixed(2),
                entry.currency,
                entry.bookingId || ''
              ])
            }
            const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `closure_${dayParam}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a)
            setTimeout(()=> URL.revokeObjectURL(url), 2000)
          }}>Exporter CSV</button>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Résumé</div>
        <div className="text-sm">Hash: <span className="font-mono">{closure.hash}</span></div>
        <div className="mt-2 text-sm">Totaux: {Object.entries(snapshot.totals).map(([key,value])=> `${key}: ${(value/100).toFixed(2)}€`).join(' • ')}</div>
        <div className="mt-1 text-sm">Vouchers: {Object.entries(snapshot.vouchers).map(([key,value])=> `${key}: ${value}`).join(' • ') || '—'}</div>
        <div className="mt-1 text-sm">TVA: Net {((snapshot.vat?.net ?? 0)/100).toFixed(2)}€ • TVA {((snapshot.vat?.vat ?? 0)/100).toFixed(2)}€ • Brut {((snapshot.vat?.gross ?? 0)/100).toFixed(2)}€</div>
      </section>

      <section className="rounded-xl border bg-white p-4 space-y-4">
        <div>
          <div className="font-semibold">Assistant de clôture</div>
          <p className="text-sm text-slate-500">Vérifiez les supports physiques avant de valider la journée.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cartes (Stripe)</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatEuro(cardTotal)}</p>
            <p className="mt-1 text-xs text-slate-500">Montant auto-importé depuis Stripe Terminal.</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Espèces</p>
            <p className="mt-1 text-xs text-slate-500">Attendu : {formatEuro(cashExpected)}</p>
            <label className="mt-3 block text-sm">
              <span className="sn-label">Fond de caisse final</span>
              <input
                type="text"
                value={cashCountInput}
                onChange={(event) => setCashCountInput(event.target.value)}
                placeholder="Comptage manuel"
                className="sn-input"
              />
            </label>
            <p className={`mt-2 text-sm font-semibold ${cashDiffTone}`}>Écart : {cashDiffDisplay}</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-lg border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Vouchers</p>
            <p className="mt-2 text-sm text-slate-700">{voucherInstruction}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Chèques</p>
            <p className="mt-2 text-sm text-slate-700">{checkInstruction}</p>
          </div>
          {otherProviders.length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Autres méthodes</p>
              <p className="mt-1 text-xs text-slate-500">Validez chaque montant secondaire (PayPal, wallets…)</p>
              <div className="mt-3 space-y-2">
                {otherProviders.map((item) => (
                  <label
                    key={item.provider}
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{item.provider}</p>
                      <p className="text-xs text-slate-500">{formatEuro(item.amount)}</p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                      checked={Boolean(otherConfirmations[item.provider])}
                      onChange={(event) =>
                        setOtherConfirmations((current) => ({
                          ...current,
                          [item.provider]: event.target.checked
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Écritures du jour</div>
        <table className="w-full text-sm">
          <thead><tr><th className="p-2">Heure</th><th className="p-2">#Reçu</th><th className="p-2">Type</th><th className="p-2">Provider</th><th className="p-2">Méthode</th><th className="p-2">Montant</th><th className="p-2">Réservation</th></tr></thead>
          <tbody>
            {entriesForDay.map((entry)=> (
              <tr key={entry.id} className="border-t">
                <td className="p-2">{format(new Date(entry.occurredAt),'HH:mm')}</td>
                <td className="p-2">{entry.receiptNo ? `${new Date(entry.occurredAt).getUTCFullYear()}-${String(entry.receiptNo).padStart(6,'0')}` : '—'}</td>
                <td className="p-2">{entry.eventType}</td>
                <td className="p-2">{entry.provider}</td>
                <td className="p-2">{entry.methodType || '—'}</td>
                <td className="p-2">{(entry.amount/100).toFixed(2)} {entry.currency}</td>
                <td className="p-2">{entry.bookingId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
