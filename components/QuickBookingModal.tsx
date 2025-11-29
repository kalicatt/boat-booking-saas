'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface QuickBookingModalProps {
    slotStart: Date
    boatId: number | string
    resources: Array<{ id: number; title: string; capacity: number }>
    onClose: () => void
    onSuccess: () => void
}

const PRICE_ADULT = 9
const PRICE_CHILD = 4

const BOOKING_STEPS = [
    { id: 'slot', label: 'Créneau' },
    { id: 'passengers', label: 'Passagers' },
    { id: 'client', label: 'Client' },
    { id: 'payment', label: 'Paiement' }
] as const

const PAYMENT_OPTIONS = [
    { value: 'cash', label: 'Espèces' },
    { value: 'card', label: 'Carte bancaire' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'applepay', label: 'Apple Pay' },
    { value: 'googlepay', label: 'Google Pay' },
    { value: 'ANCV', label: 'ANCV' },
    { value: 'CityPass', label: 'City Pass' }
] as const

const LANGUAGE_OPTIONS = [
    { value: 'FR', label: 'FR - Français' },
    { value: 'EN', label: 'EN - English' },
    { value: 'DE', label: 'DE - Deutsch' },
    { value: 'ES', label: 'ES - Español' },
    { value: 'IT', label: 'IT - Italiano' }
] as const

type PaymentOption = (typeof PAYMENT_OPTIONS)[number]['value']

export default function QuickBookingModal({ slotStart, boatId, resources, onClose, onSuccess }: QuickBookingModalProps) {
    const dialogRef = useRef<HTMLDivElement | null>(null)
    const [isLocked, setIsLocked] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)
    const [showStepErrors, setShowStepErrors] = useState(false)

    const [time, setTime] = useState('')
    const [language, setLanguage] = useState('FR')
    const [lastName, setLastName] = useState('')
    const [firstName, setFirstName] = useState('')
    const [phone, setPhone] = useState('')
    const [message, setMessage] = useState('')
    const [adults, setAdults] = useState(2)
    const [children, setChildren] = useState(0)
    const [babies, setBabies] = useState(0)
    const [markAsPaid, setMarkAsPaid] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<PaymentOption | ''>('')
    const [cashReceived, setCashReceived] = useState('')

    const numericBoatId = useMemo(() => Number(boatId), [boatId])
    const targetBoat = useMemo(
        () => resources.find((boat) => boat.id === numericBoatId),
        [resources, numericBoatId]
    )
    const fallbackBoatLabel = useMemo(
        () => (Number.isNaN(numericBoatId) ? String(boatId ?? '?') : numericBoatId.toString()),
        [numericBoatId, boatId]
    )
    const selectedPaymentLabel = useMemo(
        () => PAYMENT_OPTIONS.find((option) => option.value === paymentMethod)?.label ?? '',
        [paymentMethod]
    )
    const totalPeople = adults + children + babies
    const totalPrice = useMemo(() => adults * PRICE_ADULT + children * PRICE_CHILD, [adults, children])
    const formattedDate = useMemo(() => {
        const y = slotStart.getUTCFullYear()
        const m = String(slotStart.getUTCMonth() + 1).padStart(2, '0')
        const d = String(slotStart.getUTCDate()).padStart(2, '0')
        return `${d}/${m}/${y}`
    }, [slotStart])
    const dateLocal = useMemo(() => {
        const y = slotStart.getUTCFullYear()
        const m = String(slotStart.getUTCMonth() + 1).padStart(2, '0')
        const d = String(slotStart.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }, [slotStart])

    const passengerCounters = useMemo(
        () => [
            {
                key: 'adults',
                label: 'Adultes',
                subtitle: 'Tarif plein',
                price: '9€',
                value: adults,
                setter: setAdults
            },
            {
                key: 'children',
                label: 'Enfants',
                subtitle: '4 - 10 ans',
                price: '4€',
                value: children,
                setter: setChildren
            },
            {
                key: 'babies',
                label: 'Bébés',
                subtitle: '0 - 3 ans',
                price: 'Gratuit',
                value: babies,
                setter: setBabies
            }
        ],
        [adults, children, babies]
    )

    const parsedCash = useMemo(() => {
        if (!cashReceived) return Number.NaN
        return Number.parseFloat(cashReceived.replace(',', '.'))
    }, [cashReceived])

    const cashDifference = useMemo(() => {
        if (!markAsPaid || paymentMethod !== 'cash' || Number.isNaN(parsedCash)) return 0
        return parsedCash - totalPrice
    }, [markAsPaid, paymentMethod, parsedCash, totalPrice])

    const lacksCash = markAsPaid && paymentMethod === 'cash' && Number.isFinite(parsedCash) && parsedCash < totalPrice

    useEffect(() => {
        const hh = String(slotStart.getUTCHours()).padStart(2, '0')
        const mm = String(slotStart.getUTCMinutes()).padStart(2, '0')
        setTime(`${hh}:${mm}`)
    }, [slotStart])

    useEffect(() => {
        setStepIndex(0)
        setShowStepErrors(false)
        setMarkAsPaid(false)
        setPaymentMethod('')
        setCashReceived('')
    }, [slotStart])

    useEffect(() => {
        let mounted = true
        setIsLocked(false)
        ;(async () => {
            try {
                const res = await fetch('/api/admin/closures')
                if (!res.ok) return
                const data = await res.json()
                if (!mounted || !Array.isArray(data) || data.length === 0) return
                const latest = data.reduce((acc: any, current: any) =>
                    new Date(current.day) > new Date(acc.day) ? current : acc
                )
                const selected = new Date(
                    Date.UTC(slotStart.getUTCFullYear(), slotStart.getUTCMonth(), slotStart.getUTCDate())
                )
                const latestDay = new Date(latest.day)
                if (selected <= latestDay) setIsLocked(true)
            } catch {
                // Silent failure acceptable here
            }
        })()
        return () => {
            mounted = false
        }
    }, [slotStart])

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            }
            if (event.key === 'Tab' && dialogRef.current) {
                const focusable = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(
                        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
                    )
                ).filter((el) => !el.hasAttribute('disabled'))
                if (focusable.length === 0) return
                const first = focusable[0]
                const last = focusable[focusable.length - 1]
                const active = document.activeElement as HTMLElement
                if (event.shiftKey) {
                    if (active === first || !focusable.includes(active)) {
                        event.preventDefault()
                        last.focus()
                    }
                } else if (active === last) {
                    event.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    useEffect(() => {
        if (!markAsPaid) {
            if (cashReceived !== '') setCashReceived('')
            return
        }
        if (paymentMethod !== 'cash') {
            if (cashReceived !== '') setCashReceived('')
            return
        }
        if (cashReceived === '') {
            setCashReceived(String(totalPrice))
        }
    }, [markAsPaid, paymentMethod, totalPrice, cashReceived])

    const canProceedStep = (index: number) => {
        const stepId = BOOKING_STEPS[index]?.id
        if (stepId === 'slot') return Boolean(time)
        if (stepId === 'passengers') return totalPeople > 0
        if (stepId === 'client') return lastName.trim().length > 0
        if (stepId === 'payment') {
            if (!markAsPaid) return true
            if (!paymentMethod) return false
            if (paymentMethod === 'cash') {
                return !Number.isNaN(parsedCash) && parsedCash >= totalPrice
            }
            return true
        }
        return true
    }

    const handleNext = () => {
        if (!canProceedStep(stepIndex)) {
            setShowStepErrors(true)
            return
        }
        setStepIndex((prev) => Math.min(prev + 1, BOOKING_STEPS.length - 1))
        setShowStepErrors(false)
    }

    const handlePrevious = () => {
        setStepIndex((prev) => Math.max(0, prev - 1))
        setShowStepErrors(false)
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!canProceedStep(BOOKING_STEPS.length - 1)) {
            setShowStepErrors(true)
            return
        }
        setIsLoading(true)
        const finalFirstName = firstName.trim() || 'Client'
        const finalLastName = lastName.trim() || 'Guichet'

        const finalMessagePieces: string[] = []
        if (message.trim()) finalMessagePieces.push(message.trim())
        if (markAsPaid && paymentMethod === 'cash' && !Number.isNaN(parsedCash)) {
            const change = cashDifference
            if (change >= 0) {
                finalMessagePieces.push(
                    `Espèces: reçu ${parsedCash.toFixed(2)}€ • rendre ${Math.max(0, change).toFixed(2)}€`
                )
            } else {
                finalMessagePieces.push(
                    `Espèces: reçu ${parsedCash.toFixed(2)}€ • manque ${Math.abs(change).toFixed(2)}€`
                )
            }
        }
        const finalMessage = finalMessagePieces.join('\n')

        const bookingData: Record<string, unknown> = {
            date: dateLocal,
            time,
            adults,
            children,
            babies,
            people: totalPeople,
            language,
            message: finalMessage || undefined,
            userDetails: {
                firstName: finalFirstName,
                lastName: finalLastName,
                email: 'guichet@sweet-narcisse.com',
                phone: phone.trim()
            },
            isStaffOverride: true,
            markAsPaid
        }

        if (!Number.isNaN(numericBoatId)) {
            bookingData.forcedBoatId = numericBoatId
        }

        if (markAsPaid && paymentMethod) {
            bookingData.paymentMethod = paymentMethod
        }

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            })

            if (res.ok) {
                onSuccess()
            } else {
                const err = await res.json()
                alert(`Erreur: ${err.error}`)
            }
        } catch {
            alert('Erreur de connexion.')
        } finally {
            setIsLoading(false)
        }
    }

    const progress = BOOKING_STEPS.length > 1 ? (stepIndex / (BOOKING_STEPS.length - 1)) * 100 : 100

    const stepErrorMessage = useMemo(() => {
        if (!showStepErrors) return ''
        const stepId = BOOKING_STEPS[stepIndex]?.id
        if (stepId === 'slot' && !time) return 'Sélectionnez une heure de départ.'
        if (stepId === 'passengers' && totalPeople === 0) return 'Ajoutez au moins un passager.'
        if (stepId === 'client' && lastName.trim().length === 0) return 'Indiquez le nom du client.'
        if (stepId === 'payment' && markAsPaid) {
            if (!paymentMethod) return 'Choisissez un moyen de paiement.'
            if (lacksCash) return 'Le montant espèces est insuffisant.'
        }
        return ''
    }, [showStepErrors, stepIndex, time, totalPeople, lastName, markAsPaid, paymentMethod, lacksCash])

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-title"
            ref={dialogRef}
        >
            <div className="sn-card w-full max-w-2xl overflow-hidden" role="document">
                {isLocked && (
                    <div className="bg-red-600 text-center text-sm font-semibold uppercase tracking-wide text-white">
                        Période verrouillée — modifications interdites
                    </div>
                )}

                <div className="bg-[#0f172a] px-5 pb-5 pt-4 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 id="qb-title" className="text-lg font-bold">
                                Nouvelle réservation rapide
                            </h3>
                            <p className="text-xs text-blue-200">
                                {targetBoat ? targetBoat.title : `Barque ${fallbackBoatLabel}`} • {formattedDate}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-2xl font-bold text-white/70 transition hover:text-white"
                        >
                            ×
                        </button>
                    </div>

                    <ol className="mt-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide">
                        {BOOKING_STEPS.map((step, index) => {
                            const completed = index < stepIndex
                            const active = index === stepIndex
                            return (
                                <li key={step.id} className="flex flex-col items-center gap-1">
                                    <span
                                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm ${
                                            completed
                                                ? 'border-emerald-400 bg-emerald-400 text-slate-900'
                                                : active
                                                ? 'border-white text-white'
                                                : 'border-white/30 text-white/60'
                                        }`}
                                    >
                                        {index + 1}
                                    </span>
                                    <span className={`text-[10px] ${active ? 'text-white' : 'text-white/60'}`}>
                                        {step.label}
                                    </span>
                                </li>
                            )
                        })}
                    </ol>
                    <div className="mt-3 h-1 rounded-full bg-white/20">
                        <div
                            className="h-full rounded-full bg-emerald-400 transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 text-slate-900">
                    {stepIndex === 0 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Départ</p>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-3xl font-extrabold text-slate-800">{time || '--:--'}</p>
                                        <p className="text-xs text-slate-500">{formattedDate}</p>
                                    </div>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(event) => setTime(event.target.value)}
                                        className="rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-blue-900 shadow-inner focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Barque</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                        {targetBoat ? targetBoat.title : `Barque ${fallbackBoatLabel}`}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Capacité {targetBoat?.capacity ?? '—'} passagers
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Langue du tour
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(event) => setLanguage(event.target.value)}
                                        className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                    >
                                        {LANGUAGE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {stepIndex === 1 && (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                                {passengerCounters.map((counter) => (
                                    <div key={counter.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <p className="text-sm font-semibold text-slate-700">{counter.label}</p>
                                        <p className="text-xs text-slate-500">
                                            {counter.subtitle} • {counter.price}
                                        </p>
                                        <div className="mt-3 flex items-center justify-between rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5">
                                            <button
                                                type="button"
                                                onClick={() => counter.setter((prev) => Math.max(0, prev - 1))}
                                                className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600 shadow hover:bg-slate-100"
                                            >
                                                −
                                            </button>
                                            <span className="text-lg font-bold text-slate-800">{counter.value}</span>
                                            <button
                                                type="button"
                                                onClick={() => counter.setter((prev) => prev + 1)}
                                                className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600 shadow hover:bg-slate-100"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                                <p className="font-semibold">
                                    {totalPeople} passager{totalPeople > 1 ? 's' : ''} à embarquer
                                </p>
                                <p className="text-xs">
                                    Estimation encaissement :{' '}
                                    <span className="font-semibold text-blue-900">{totalPrice} €</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {stepIndex === 2 && (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Nom du client
                                    </label>
                                    <input
                                        value={lastName}
                                        onChange={(event) => setLastName(event.target.value)}
                                        placeholder="Nom"
                                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Prénom
                                    </label>
                                    <input
                                        value={firstName}
                                        onChange={(event) => setFirstName(event.target.value)}
                                        placeholder="Prénom"
                                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Téléphone
                                    </label>
                                    <input
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        placeholder="Optionnel"
                                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                    L'adresse email est générée automatiquement pour les réservations guichet.
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Note interne / commentaire
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Ex: Groupe scolaire, arrivée anticipée, etc."
                                    className="mt-1 h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {stepIndex === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={markAsPaid}
                                        onChange={(event) => setMarkAsPaid(event.target.checked)}
                                        disabled={isLocked}
                                    />
                                    Marquer la réservation comme payée
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                    Cette action enregistrera immédiatement un paiement manuel.
                                </p>

                                {markAsPaid && (
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Mode de paiement
                                            </label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(event) => setPaymentMethod(event.target.value as PaymentOption | '')}
                                                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="" disabled>
                                                    Sélectionnez un mode de paiement
                                                </option>
                                                {PAYMENT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {paymentMethod === 'cash' && (
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Montant perçu (€)
                                                </label>
                                                <input
                                                    value={cashReceived}
                                                    onChange={(event) => setCashReceived(event.target.value)}
                                                    inputMode="decimal"
                                                    placeholder={String(totalPrice)}
                                                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                                />
                                                {markAsPaid && paymentMethod === 'cash' && !Number.isNaN(parsedCash) && (
                                                    <p
                                                        className={`mt-1 text-xs font-semibold ${
                                                            lacksCash ? 'text-rose-600' : 'text-emerald-600'
                                                        }`}
                                                    >
                                                        {cashDifference >= 0
                                                            ? `Rendre ${cashDifference.toFixed(2)} €`
                                                            : `Manque ${Math.abs(cashDifference).toFixed(2)} €`}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <p className="font-semibold text-slate-800">Récapitulatif</p>
                                <ul className="mt-2 space-y-1 text-xs">
                                    <li>
                                        {formattedDate} • {time}
                                    </li>
                                    <li>
                                        {totalPeople} passager{totalPeople > 1 ? 's' : ''} (A{adults} / E{children} / B{babies})
                                    </li>
                                    <li>Montant estimé : {totalPrice} €</li>
                                    <li>Barque : {targetBoat ? targetBoat.title : `Barque ${fallbackBoatLabel}`}</li>
                                    <li>
                                        Paiement :
                                        {' '}
                                        {markAsPaid && paymentMethod
                                            ? selectedPaymentLabel || 'Marqué comme payé'
                                            : 'à percevoir sur place'}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {stepErrorMessage && (
                        <p className="text-xs font-semibold text-rose-600">{stepErrorMessage}</p>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Annuler
                        </button>

                        <div className="flex items-center gap-2">
                            {stepIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    ← Retour
                                </button>
                            )}

                            {stepIndex < BOOKING_STEPS.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-blue-700"
                                >
                                    Étape suivante →
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading || isLocked || !canProceedStep(stepIndex)}
                                    className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isLocked ? 'Période verrouillée' : isLoading ? 'Enregistrement…' : 'Confirmer la réservation'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}