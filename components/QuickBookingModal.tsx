'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import type { CountryCode } from 'libphonenumber-js'

import { CheckDetailsForm, VoucherDetailsForm } from '@/components/ManualPaymentDetails'
import {
    buildManualPaymentPayload,
    createCheckDetails,
    createEmptyManualPaymentState,
    createVoucherDetails,
    type ManualPaymentState,
    updateManualPaymentState,
    validateManualPaymentState
} from '@/lib/manualPayments'

interface QuickBookingModalProps {
    slotStart: Date
    boatId: number | string
    resources: Array<{ id: number; title: string; capacity: number }>
    onClose: () => void
    onSuccess: () => void
    canOverrideLockedDays?: boolean
}

const PRICE_ADULT = 9
const PRICE_CHILD = 4

const BOOKING_STEPS = [
    { id: 'slot', label: 'Créneau' },
    { id: 'passengers', label: 'Passagers' },
    { id: 'client', label: 'Client' },
    { id: 'payment', label: 'Paiement' }
] as const

const LAST_STEP_INDEX = BOOKING_STEPS.length - 1

const PAYMENT_OPTIONS = [
    { value: 'cash', label: 'Espèces' },
    { value: 'card', label: 'Carte bancaire' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'applepay', label: 'Apple Pay' },
    { value: 'googlepay', label: 'Google Pay' },
    { value: 'voucher', label: 'Voucher / Hôtel' },
    { value: 'check', label: 'Chèque' }
] as const

const LANGUAGE_OPTIONS = [
    { value: 'FR', label: 'FR - Français' },
    { value: 'EN', label: 'EN - English' },
    { value: 'DE', label: 'DE - Deutsch' },
    { value: 'ES', label: 'ES - Español' },
    { value: 'IT', label: 'IT - Italiano' }
] as const

type PaymentOption = (typeof PAYMENT_OPTIONS)[number]['value']

const CASH_KEYPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '.'] as const

function normalizePhoneForApi(input: string): string | undefined {
    const trimmed = input.trim()
    if (!trimmed) return undefined

    const attempts: Array<{ value: string; country?: CountryCode }> = []
    attempts.push({ value: trimmed })

    const replaced00 = trimmed.replace(/^\s*00/, '+')
    if (replaced00 !== trimmed) attempts.push({ value: replaced00 })

    const digits = trimmed.replace(/[^0-9+]/g, '')
    const plainDigits = trimmed.replace(/[^0-9]/g, '')
    if (digits && digits.startsWith('+')) {
        attempts.push({ value: digits })
    }

    if (plainDigits) {
        attempts.push({ value: plainDigits, country: 'FR' })
        const withoutLeadingZero = plainDigits.replace(/^0+/, '')
        if (withoutLeadingZero) {
            attempts.push({ value: `+${withoutLeadingZero}` })
            attempts.push({ value: withoutLeadingZero, country: 'FR' })
        }
    }

    for (const attempt of attempts) {
        const parsed = attempt.country
            ? parsePhoneNumberFromString(attempt.value, attempt.country)
            : parsePhoneNumberFromString(attempt.value)
        if (parsed && parsed.isValid()) {
            return parsed.number
        }
    }

    return undefined
}

export default function QuickBookingModal({ slotStart, boatId, resources, onClose, onSuccess, canOverrideLockedDays = false }: QuickBookingModalProps) {
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
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [adults, setAdults] = useState(2)
    const [children, setChildren] = useState(0)
    const [babies, setBabies] = useState(0)
    const [markAsPaid, setMarkAsPaid] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<PaymentOption | ''>('')
    const [manualPayment, setManualPayment] = useState<ManualPaymentState>(createEmptyManualPaymentState)
    const [cashReceived, setCashReceived] = useState('')
    const [isCashPadOpen, setIsCashPadOpen] = useState(false)
    const [cashTouched, setCashTouched] = useState(false)
    const cashInputRef = useRef<HTMLInputElement | null>(null)
    const cashPadRef = useRef<HTMLDivElement | null>(null)

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
    const paymentSummaryLabel = useMemo(() => {
        if (!markAsPaid || !paymentMethod) {
            return 'à percevoir sur place'
        }
        if (manualPayment.provider === 'voucher') {
            const detail = manualPayment.methodType?.trim()
            const base = selectedPaymentLabel || 'Voucher / Hôtel'
            return detail ? `${base} • ${detail}` : base
        }
        if (manualPayment.provider === 'check') {
            return 'Chèque'
        }
        return selectedPaymentLabel || 'Marqué comme payé'
    }, [manualPayment, markAsPaid, paymentMethod, selectedPaymentLabel])
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
        setManualPayment(createEmptyManualPaymentState())
        setCashReceived('')
        setIsCashPadOpen(false)
        setCashTouched(false)
        setEmail('')
    }, [slotStart])

    useEffect(() => {
        let mounted = true
        setIsLocked(false)
        if (canOverrideLockedDays) {
            return () => {
                mounted = false
            }
        }
        ;(async () => {
            try {
                const res = await fetch('/api/admin/closures')
                if (!res.ok) return
                const data = await res.json()
                if (!mounted || !Array.isArray(data) || data.length === 0) return
                type ClosureRecord = { day: string }
                const latest = data.reduce((acc: ClosureRecord, current: ClosureRecord) =>
                    new Date(current.day) > new Date(acc.day) ? current : acc
                , data[0] as ClosureRecord)
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
    }, [slotStart, canOverrideLockedDays])

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
            if (cashTouched) setCashTouched(false)
            return
        }
        if (paymentMethod !== 'cash') {
            if (cashReceived !== '') setCashReceived('')
            if (cashTouched) setCashTouched(false)
            return
        }
        if (!cashTouched && cashReceived === '') {
            setCashReceived(sanitizeCashValue(String(totalPrice)))
        }
    }, [markAsPaid, paymentMethod, totalPrice, cashReceived, cashTouched])

    useEffect(() => {
        if (!isCashPadOpen) return
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node
            if (cashPadRef.current?.contains(target)) return
            if (cashInputRef.current?.contains(target as Node)) return
            setIsCashPadOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [isCashPadOpen])

    useEffect(() => {
        if (stepIndex !== LAST_STEP_INDEX) setIsCashPadOpen(false)
    }, [stepIndex])

    useEffect(() => {
        if (!markAsPaid || paymentMethod !== 'cash') setIsCashPadOpen(false)
    }, [markAsPaid, paymentMethod])

    const canProceedStep = (index: number) => {
        const stepId = BOOKING_STEPS[index]?.id
        if (stepId === 'slot') return Boolean(time)
        if (stepId === 'passengers') return totalPeople > 0
        if (stepId === 'client') return true
        if (stepId === 'payment') {
            if (!markAsPaid) return true
            if (!paymentMethod) return false
            if (paymentMethod === 'cash') {
                return !Number.isNaN(parsedCash) && parsedCash >= totalPrice
            }
            if (paymentMethod === 'voucher' || paymentMethod === 'check') {
                return !validateManualPaymentState(manualPayment)
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

    const triggerTapToPaySession = async (bookingId: string) => {
        const response = await fetch('/api/payments/terminal/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId })
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
            const message = typeof payload?.error === 'string' ? payload.error : 'Création Tap to Pay impossible'
            throw new Error(message)
        }
        return payload
    }

    const handleConfirm = async () => {
        if (isLoading) return
        if (!canProceedStep(LAST_STEP_INDEX)) {
            setShowStepErrors(true)
            return
        }
        const finalFirstName = firstName.trim() || 'Client'
        const finalLastName = lastName.trim() || 'Guichet'
        const providedEmail = email.trim().toLowerCase()
        const normalizedPhone = normalizePhoneForApi(phone)
        if (phone.trim() && !normalizedPhone) {
            alert("Numéro de téléphone invalide. Utilisez le format international (ex: +33...).")
            setShowStepErrors(true)
            return
        }
        setIsLoading(true)

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

        const shouldTriggerTapToPay = markAsPaid && paymentMethod === 'card'

        let manualPaymentPayload: Record<string, unknown> | null = null
        if (markAsPaid && paymentMethod && (paymentMethod === 'voucher' || paymentMethod === 'check')) {
            const buildResult = buildManualPaymentPayload(manualPayment)
            if (!buildResult.ok || !buildResult.paymentMethod) {
                alert(buildResult.error ?? 'Sélectionnez un moyen de paiement.')
                setShowStepErrors(true)
                setIsLoading(false)
                return
            }
            manualPaymentPayload = buildResult.paymentMethod
        }

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
                email: providedEmail || 'guichet@sweet-narcisse.com',
                phone: normalizedPhone
            },
            isStaffOverride: true,
            markAsPaid: shouldTriggerTapToPay ? false : markAsPaid
        }

        if (!Number.isNaN(numericBoatId)) {
            bookingData.forcedBoatId = numericBoatId
        }

        if (providedEmail) {
            bookingData.invoiceEmail = providedEmail
        }

        if (markAsPaid && paymentMethod) {
            bookingData.paymentMethod = manualPaymentPayload ?? paymentMethod
        }

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            })

            const payload = await res.json().catch(() => ({}))

            if (res.ok) {
                if (shouldTriggerTapToPay) {
                    const bookingId = payload?.bookingId || payload?.booking?.id
                    if (bookingId) {
                        try {
                            await triggerTapToPaySession(String(bookingId))
                            alert('Réservation créée. Le Tap to Pay est prêt sur le téléphone.')
                        } catch (error) {
                            console.error('Tap to Pay session failed', error)
                            alert('Réservation créée mais impossible de lancer Tap to Pay. Merci de finaliser l’encaissement manuellement.')
                        }
                    } else {
                        alert('Réservation créée, mais identifiant manquant pour lancer Tap to Pay.')
                    }
                }
                onSuccess()
            } else {
                const message = typeof payload?.error === 'string' ? payload.error : 'Erreur inconnue'
                alert(`Erreur: ${message}`)
            }
        } catch {
            alert('Erreur de connexion.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key !== 'Enter') return
        if (event.repeat) {
            event.preventDefault()
            return
        }
        event.preventDefault()
        if (stepIndex < LAST_STEP_INDEX) {
            handleNext()
            return
        }
        void handleConfirm()
    }

    function sanitizeCashValue(raw: string) {
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

    const handleCashInputChange = (value: string) => {
        if (!cashTouched) setCashTouched(true)
        const sanitized = sanitizeCashValue(value)
        setCashReceived(sanitized)
        if (showStepErrors) setShowStepErrors(false)
    }

    const handleCashPadOpen = () => {
        if (!isCashPadOpen) setIsCashPadOpen(true)
        requestAnimationFrame(() => cashInputRef.current?.focus())
    }

    const handleCashPadInput = (key: string) => {
        if (key === 'CLOSE') {
            setIsCashPadOpen(false)
            return
        }
        if (key === 'CLEAR') {
            if (!cashTouched) setCashTouched(true)
            setCashReceived('')
            if (showStepErrors) setShowStepErrors(false)
            return
        }
        if (key === 'BACK') {
            if (!cashTouched) setCashTouched(true)
            setCashReceived((prev) => (prev ? prev.slice(0, -1) : ''))
            if (showStepErrors) setShowStepErrors(false)
            return
        }
        if (!cashTouched) setCashTouched(true)
        setCashReceived((prev) => {
            const base = prev || ''
            if (key === '.') {
                if (base.includes('.')) return base
                const appended = base === '' ? '0.' : `${base}.`
                return sanitizeCashValue(appended)
            }
            if (key === '00') {
                const appended = `${base}00`
                return sanitizeCashValue(appended)
            }
            if (/^\d$/.test(key)) {
                const appended = base === '0' ? key : `${base}${key}`
                return sanitizeCashValue(appended)
            }
            return base
        })
        if (showStepErrors) setShowStepErrors(false)
    }

    const handlePaymentMethodChange = (value: PaymentOption | '') => {
        setPaymentMethod(value)
        setManualPayment((current) => updateManualPaymentState(value, current))
        if (showStepErrors) setShowStepErrors(false)
    }

    const progress = BOOKING_STEPS.length > 1 ? (stepIndex / LAST_STEP_INDEX) * 100 : 100

    const stepErrorMessage = useMemo(() => {
        if (!showStepErrors) return ''
        const stepId = BOOKING_STEPS[stepIndex]?.id
        if (stepId === 'slot' && !time) return 'Sélectionnez une heure de départ.'
        if (stepId === 'passengers' && totalPeople === 0) return 'Ajoutez au moins un passager.'
        if (stepId === 'payment' && markAsPaid) {
            if (!paymentMethod) return 'Choisissez un moyen de paiement.'
            if (paymentMethod === 'voucher' || paymentMethod === 'check') {
                const manualError = validateManualPaymentState(manualPayment)
                if (manualError) return manualError
            }
            if (lacksCash) return 'Le montant espèces est insuffisant.'
        }
        return ''
    }, [showStepErrors, stepIndex, time, totalPeople, markAsPaid, paymentMethod, manualPayment, lacksCash])

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

                <form
                    onSubmit={(event) => event.preventDefault()}
                    onKeyDown={handleFormKeyDown}
                    className="space-y-5 px-5 py-6 text-slate-900"
                >
                    {stepIndex === 0 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500" id="qbm-departure-label">Départ</p>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-3xl font-extrabold text-slate-800">{time || '--:--'}</p>
                                        <p className="text-xs text-slate-500">{formattedDate}</p>
                                    </div>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(event) => setTime(event.target.value)}
                                        aria-labelledby="qbm-departure-label"
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
                                    <label htmlFor="qbm-language" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Langue du tour
                                    </label>
                                    <select
                                        id="qbm-language"
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
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div>
                                            <label htmlFor="qbm-lastName" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Nom du client
                                            </label>
                                            <input
                                                id="qbm-lastName"
                                                value={lastName}
                                                onChange={(event) => setLastName(event.target.value)}
                                                placeholder="Nom"
                                                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="qbm-firstName" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Prénom
                                            </label>
                                            <input
                                                id="qbm-firstName"
                                                value={firstName}
                                                onChange={(event) => setFirstName(event.target.value)}
                                                placeholder="Prénom"
                                                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="qbm-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Email (facture)
                                            </label>
                                            <input
                                                id="qbm-email"
                                                type="email"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                placeholder="client@email.com"
                                                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="qbm-phone" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Téléphone
                                            </label>
                                            <input
                                                id="qbm-phone"
                                                value={phone}
                                                onChange={(event) => setPhone(event.target.value)}
                                                placeholder="Optionnel"
                                                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                            L&apos;adresse email est facultative : laissez vide pour une réservation guichet classique.
                                        </div>
                                    </div>

                            <div>
                                <label htmlFor="qbm-message" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Note interne / commentaire
                                </label>
                                <textarea
                                    id="qbm-message"
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
                                        onChange={(event) => {
                                            const checked = event.target.checked
                                            setMarkAsPaid(checked)
                                            if (!checked) {
                                                setPaymentMethod('')
                                                setManualPayment(createEmptyManualPaymentState())
                                            }
                                        }}
                                        disabled={isLocked}
                                    />
                                    Marquer la réservation comme payée
                                </label>
                                <p className="mt-1 text-xs text-slate-500">
                                    Cette action enregistrera immédiatement un paiement manuel.
                                </p>

                                {markAsPaid && (
                                    <>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="qbm-paymentMethod" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Mode de paiement
                                            </label>
                                            <select
                                                id="qbm-paymentMethod"
                                                value={paymentMethod}
                                                    onChange={(event) =>
                                                        handlePaymentMethodChange(event.target.value as PaymentOption | '')
                                                    }
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
                                            <div className="relative">
                                                <label htmlFor="qbm-cashReceived" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Montant perçu (€)
                                                </label>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <input
                                                        id="qbm-cashReceived"
                                                        ref={cashInputRef}
                                                        value={cashReceived}
                                                        onChange={(event) => handleCashInputChange(event.target.value)}
                                                        onFocus={handleCashPadOpen}
                                                        inputMode="decimal"
                                                        autoComplete="off"
                                                        placeholder={String(totalPrice)}
                                                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-inner focus:border-blue-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleCashPadOpen}
                                                        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                                    >
                                                        Pavé
                                                    </button>
                                                </div>
                                                {isCashPadOpen && (
                                                    <div
                                                        ref={cashPadRef}
                                                        className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
                                                    >
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {CASH_KEYPAD_KEYS.map((key) => (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={() => handleCashPadInput(key)}
                                                                    className="rounded-xl bg-slate-100 py-2 text-base font-semibold text-slate-800 shadow-inner hover:bg-slate-200"
                                                                >
                                                                    {key}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCashPadInput('BACK')}
                                                                className="rounded-xl bg-slate-100 py-2 font-semibold text-slate-800 shadow-inner hover:bg-slate-200"
                                                            >
                                                                ⌫
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCashPadInput('CLEAR')}
                                                                className="rounded-xl bg-slate-100 py-2 font-semibold text-rose-600 shadow-inner hover:bg-rose-100"
                                                            >
                                                                Effacer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCashPadInput('CLOSE')}
                                                                className="rounded-xl bg-emerald-500 py-2 font-semibold text-white shadow hover:bg-emerald-600"
                                                            >
                                                                Fermer
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
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
                                        {manualPayment.provider === 'voucher' && (
                                            <VoucherDetailsForm
                                                value={manualPayment.voucherDetails ?? createVoucherDetails()}
                                                disabled={isLocked}
                                                onChange={(details, methodType) =>
                                                    setManualPayment((current) => ({
                                                        ...current,
                                                        methodType: methodType ?? current.methodType,
                                                        voucherDetails: details
                                                    }))
                                                }
                                            />
                                        )}
                                        {manualPayment.provider === 'check' && (
                                            <CheckDetailsForm
                                                value={manualPayment.checkDetails ?? createCheckDetails()}
                                                disabled={isLocked}
                                                onChange={(details) =>
                                                    setManualPayment((current) => ({
                                                        ...current,
                                                        checkDetails: details
                                                    }))
                                                }
                                            />
                                        )}
                                    </>
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
                                    <li>Email : {email.trim() || 'par défaut guichet'}</li>
                                    <li>Paiement : {paymentSummaryLabel}</li>
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
                                    type="button"
                                    onClick={() => void handleConfirm()}
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