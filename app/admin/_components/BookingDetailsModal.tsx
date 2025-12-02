'use client'

import { format } from 'date-fns'
import type { Dispatch, SetStateAction } from 'react'
import {
  STATUS_THEME,
  BOOKING_STATUS_THEME,
  LANGUAGE_FLAGS,
  type BoardingStatus,
  type BookingDetails,
  type PaymentMarkState
} from './bookingTypes'

interface BookingDetailsModalProps {
  booking: BookingDetails
  resources: Array<{ id: number; title: string; capacity: number }>
  detailsMarkPaid: PaymentMarkState
  setDetailsMarkPaid: Dispatch<SetStateAction<PaymentMarkState>>
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  hasPrev: boolean
  hasNext: boolean
  groupIndex: number
  groupTotal: number
  paymentSelectorOpen: boolean
  onPaymentSelectorOpen: () => void
  onPaymentSelectorClose: () => void
  onStatusUpdate: (id: string, newCheckinStatus?: BoardingStatus, newIsPaid?: boolean) => Promise<void>
  onEditTime: (booking: BookingDetails) => void
  onDelete: (id: string, title: string) => void
}

export function BookingDetailsModal({
  booking,
  resources,
  detailsMarkPaid,
  setDetailsMarkPaid,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  groupIndex,
  groupTotal,
  paymentSelectorOpen,
  onPaymentSelectorOpen,
  onPaymentSelectorClose,
  onStatusUpdate,
  onEditTime,
  onDelete
}: BookingDetailsModalProps) {
  const displayedClientName = `${booking.user.firstName} ${booking.user.lastName}`
  const checkinStatus = (booking.checkinStatus || 'CONFIRMED') as BoardingStatus
  const statusTheme = STATUS_THEME[checkinStatus] ?? STATUS_THEME.CONFIRMED
  const bookingState = BOOKING_STATUS_THEME[booking.status] ?? BOOKING_STATUS_THEME.CONFIRMED
  const boatTitle =
    resources.find((resource) => Number(resource.id) === Number(booking.resourceId))?.title ??
    `Barque ${booking.resourceId}`
  const languageFlag = booking.language ? LANGUAGE_FLAGS[booking.language] ?? booking.language : ''
  const languageLabel = booking.language ? `${languageFlag ? `${languageFlag} ` : ''}${booking.language}` : '—'
  const totalOnBoat = booking.totalOnBoat ?? booking.peopleCount ?? 0
  const loadPct = booking.boatCapacity ? Math.round((totalOnBoat / booking.boatCapacity) * 100) : null
  const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
  const totalPriceLabel = priceFormatter.format(booking.totalPrice || 0)
  const dueAmount =
    typeof booking.totalPrice === 'number' && Number.isFinite(booking.totalPrice) ? booking.totalPrice : 0
  const defaultCashPreset = dueAmount.toFixed(2)
  const rawCashInput = detailsMarkPaid?.provider === 'cash' ? detailsMarkPaid.cashGiven ?? '' : ''
  const parsedCashInput = rawCashInput ? Number.parseFloat(rawCashInput) : Number.NaN
  const normalizedCashInput = !Number.isNaN(parsedCashInput) ? Number(parsedCashInput.toFixed(2)) : null
  const hasCashValue = detailsMarkPaid?.provider === 'cash' && normalizedCashInput !== null
  const cashDifference = hasCashValue && normalizedCashInput !== null ? normalizedCashInput - dueAmount : null
  const positiveCashDifference = cashDifference ?? 0

  const sanitizeCashInput = (raw: string) => {
    if (!raw) return ''
    let next = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '.')
    const dotIndex = next.indexOf('.')
    if (dotIndex >= 0) {
      const before = next.slice(0, dotIndex + 1)
      const after = next
        .slice(dotIndex + 1)
        .replace(/\./g, '')
        .slice(0, 2)
      next = `${before}${after}`
    }
    if (!next.startsWith('0.') && next.startsWith('0')) {
      next = next.replace(/^0+(\d)/, '$1')
    }
    return next
  }

  const message = (booking.message || '').trim()
  const statusOptions: BoardingStatus[] = ['CONFIRMED', 'EMBARQUED', 'NO_SHOW']
  const occupantBreakdown = [
    { label: 'Adultes', value: booking.adults || 0 },
    { label: 'Enfants', value: booking.children || 0 },
    { label: 'Bébés', value: booking.babies || 0 }
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 p-4">
      <div className="relative flex w-full max-w-5xl justify-center px-1 sm:px-0">
        {hasPrev && (
          <button
            type="button"
            onClick={() => onNavigate('prev')}
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-2xl font-semibold text-white shadow-lg transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Réservation précédente"
          >
            ◀
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => onNavigate('next')}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-2xl font-semibold text-white shadow-lg transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Réservation suivante"
          >
            ▶
          </button>
        )}
        <div className="flex h-full w-full max-w-4xl max-h-[92vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 opacity-95"
              style={{ background: `linear-gradient(135deg, ${statusTheme.background}, ${statusTheme.backgroundSoft})` }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-5 text-white sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
                  <span>{boatTitle}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-white/60 sm:inline" aria-hidden="true" />
                  <span>Départ {format(booking.start, 'dd/MM')}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-3 text-white">
                  <span className="text-3xl font-semibold leading-none">{format(booking.start, 'HH:mm')}</span>
                  <span className="text-sm font-medium uppercase tracking-wide text-white/75">
                    jusqu&apos;à {format(booking.end, 'HH:mm')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className="rounded-full bg-white/15 px-3 py-1">Check-in : {statusTheme.label}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1">Réservation : {bookingState.label}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1">{languageLabel}</span>
                </div>
              </div>
              <div className="ml-auto flex items-start gap-3">
                {groupTotal > 1 && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                    Réservation {groupIndex + 1}/{groupTotal}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white/15 p-2 text-lg font-semibold leading-none text-white transition hover:bg-white/25"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[280px,1fr]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Client</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      {booking.user.role || 'Client'}
                    </span>
                  </header>
                  <div className="mt-3 space-y-2">
                    <p className="text-lg font-semibold text-slate-900">{displayedClientName}</p>
                    <div className="flex flex-col gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">
                          📧
                        </span>
                        {booking.user.email ? (
                          <a href={`mailto:${booking.user.email}`} className="break-all text-blue-600 hover:underline">
                            {booking.user.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">Non renseigné</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">
                          📞
                        </span>
                        {booking.user.phone ? (
                          <a href={`tel:${booking.user.phone}`} className="text-blue-600 hover:underline">
                            {booking.user.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">Non renseigné</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Départ</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{languageLabel}</span>
                  </header>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{format(booking.start, 'dd/MM')}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Date</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{format(booking.start, 'HH:mm')}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Départ</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{format(booking.end, 'HH:mm')}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Retour estimé</p>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {totalOnBoat} / {booking.boatCapacity}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Occupation</p>
                    </div>
                  </div>
                  {loadPct !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>Charge</span>
                        <span>{Math.min(Math.max(loadPct, 0), 200)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${Math.min(Math.max(loadPct, 0), 110)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {occupantBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center"
                      >
                        <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                      </div>
                    ))}
                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-slate-900">{booking.peopleCount}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                    </div>
                  </div>
                </section>

                {message && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
                    <header className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Note du client
                    </header>
                    <p className="mt-2 whitespace-pre-line leading-relaxed">{message}</p>
                  </section>
                )}
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut d&apos;embarquement</p>
                      <p className="text-sm text-slate-500">Ajustez l&apos;état pour synchroniser le planning.</p>
                    </div>
                    <span className={`rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold ${statusTheme.badge}`}>
                      {statusTheme.label}
                    </span>
                  </header>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {statusOptions.map((option) => {
                      const optionTheme = STATUS_THEME[option]
                      const isActive = checkinStatus === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            if (checkinStatus !== option) void onStatusUpdate(booking.id, option)
                          }}
                          disabled={isActive}
                          className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                            isActive
                              ? `${optionTheme.badge} border-transparent shadow-sm`
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                          } ${isActive ? 'cursor-default opacity-90' : ''}`}
                        >
                          {optionTheme.label}
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paiement</p>
                      <p className="text-sm text-slate-500">Total dû : {totalPriceLabel}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        booking.isPaid
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {booking.isPaid ? 'Réglé' : 'À encaisser'}
                    </span>
                  </header>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {Array.isArray(booking.payments) && booking.payments.length > 0 ? (
                      <ul className="space-y-2">
                        {booking.payments.map((payment) => (
                          <li
                            key={payment.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <span className="font-semibold text-slate-700">
                              {payment.provider}
                              {payment.methodType ? ` · ${payment.methodType}` : ''}
                            </span>
                            <span className="text-slate-500">
                              {(payment.amount / 100).toFixed(2)} {payment.currency} ·{' '}
                              {format(new Date(payment.createdAt), 'dd/MM HH:mm')}
                            </span>
                            <span className="text-xs uppercase tracking-wide text-slate-400">{payment.status}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs uppercase tracking-wide text-slate-400">Aucun règlement enregistré.</p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {booking.isPaid ? (
                      <button
                        type="button"
                        onClick={() => void onStatusUpdate(booking.id, undefined, false)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        Marquer non payé
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (paymentSelectorOpen) {
                            onPaymentSelectorClose()
                          } else {
                            onPaymentSelectorOpen()
                            setDetailsMarkPaid((prev) => prev ?? { provider: '', methodType: undefined, cashGiven: '' })
                          }
                        }}
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                      >
                        {paymentSelectorOpen ? 'Fermer' : 'Enregistrer un paiement'}
                      </button>
                    )}
                  </div>
                  {!booking.isPaid && paymentSelectorOpen && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Méthode utilisée</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                          value={detailsMarkPaid?.provider ?? ''}
                          onChange={(event) => {
                            const provider = event.target.value
                            setDetailsMarkPaid((prev) => {
                              if (!provider) {
                                return { provider: '', methodType: undefined, cashGiven: undefined }
                              }
                              const next: { provider: string; methodType?: string; cashGiven?: string } = { provider }
                              if (provider === 'voucher') {
                                next.methodType = prev?.methodType ?? 'ANCV'
                              }
                              if (provider === 'cash') {
                                const preserved = prev?.provider === 'cash' ? prev.cashGiven : undefined
                                next.cashGiven = preserved && preserved !== '' ? preserved : defaultCashPreset
                              }
                              return next
                            })
                          }}
                        >
                          <option value="">-- moyen --</option>
                          <option value="cash">Espèces</option>
                          <option value="card">Carte</option>
                          <option value="paypal">PayPal</option>
                          <option value="applepay">Apple Pay</option>
                          <option value="googlepay">Google Pay</option>
                          <option value="voucher">ANCV / CityPass</option>
                        </select>
                        {detailsMarkPaid?.provider === 'voucher' && (
                          <select
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                            value={detailsMarkPaid?.methodType ?? 'ANCV'}
                            onChange={(event) =>
                              setDetailsMarkPaid((prev) => (prev ? { ...prev, methodType: event.target.value } : prev))
                            }
                          >
                            <option value="ANCV">ANCV</option>
                            <option value="CityPass">CityPass</option>
                          </select>
                        )}
                        {detailsMarkPaid?.provider === 'cash' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
                              value={detailsMarkPaid.cashGiven ?? ''}
                              onChange={(event) => {
                                const sanitized = sanitizeCashInput(event.target.value)
                                setDetailsMarkPaid((prev) => (prev ? { ...prev, cashGiven: sanitized } : prev))
                              }}
                              onBlur={() => {
                                setDetailsMarkPaid((prev) => {
                                  if (!prev || !prev.cashGiven) return prev
                                  const parsed = Number.parseFloat(prev.cashGiven)
                                  if (Number.isNaN(parsed)) return prev
                                  return { ...prev, cashGiven: parsed.toFixed(2) }
                                })
                              }}
                              placeholder={defaultCashPreset}
                              aria-label="Montant reçu"
                            />
                            <button
                              type="button"
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                              onClick={() =>
                                setDetailsMarkPaid((prev) =>
                                  prev ? { ...prev, cashGiven: defaultCashPreset } : prev
                                )
                              }
                            >
                              Montant dû
                            </button>
                            <span
                              className={`text-xs font-semibold ${
                                hasCashValue
                                  ? cashDifference !== null && cashDifference >= 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {hasCashValue
                                ? cashDifference !== null && cashDifference >= 0
                                  ? `À rendre : ${priceFormatter.format(positiveCashDifference > 0 ? positiveCashDifference : 0)}`
                                  : `Montant manquant : ${priceFormatter.format(Math.abs(positiveCashDifference))}`
                                : 'Indiquez le montant reçu'}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                          onClick={async () => {
                            if (!detailsMarkPaid?.provider) {
                              alert('Sélectionnez un moyen de paiement')
                              return
                            }
                            if (detailsMarkPaid.provider === 'cash') {
                              if (normalizedCashInput === null) {
                                alert('Montant espèces invalide')
                                return
                              }
                              if (normalizedCashInput < dueAmount) {
                                const confirmShort = window.confirm(
                                  `Le montant reçu (${priceFormatter.format(normalizedCashInput)}) est inférieur au total dû (${priceFormatter.format(dueAmount)}). Valider quand même ?`
                                )
                                if (!confirmShort) return
                              }
                            }
                            await onStatusUpdate(booking.id, undefined, true)
                            onPaymentSelectorClose()
                          }}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                          onClick={() => {
                            onPaymentSelectorClose()
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="text-xs font-semibold uppercase tracking-wide text-slate-500">Autres actions</header>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEditTime(booking)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                    >
                      Modifier l&apos;heure
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(booking.id, booking.clientName)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                    >
                      Supprimer la réservation
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
