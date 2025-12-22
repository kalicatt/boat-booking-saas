'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { PHONE_CODES } from '@/lib/phoneData'
import { localToE164, isPossibleLocalDigits, isValidE164, formatInternational } from '@/lib/phone'
import { PRICES, GROUP_THRESHOLD, MIN_BOOKING_DELAY_MINUTES, PAYMENT_TIMEOUT_MINUTES } from '@/lib/config'
import ReCAPTCHA from 'react-google-recaptcha'
import dynamic from 'next/dynamic'
import type { Lang } from '@/lib/contactClient'
import { useFunnelTracking } from '@/lib/funnelTracking'
const ContactModal = dynamic(() => import('@/components/ContactModal'), { ssr: false })
import PaymentElementWrapper from '@/components/PaymentElementWrapper'
import StripeWalletButton from '@/components/StripeWalletButton'
import PayPalButton from '@/components/PayPalButton'
import PaymentCountdown from '@/components/PaymentCountdown'

type BookingWidgetCopy = {
    captcha_required?: string
    booking_create_failed?: string
    booking_not_found?: string
    step_criteria_short?: string
    step_criteria_title?: string
    step_slots_short?: string
    step_slots_title?: string
    step_contact_short?: string
    form_title?: string
    payment_title?: string
    progress_label?: string
    summary_title_standard?: string
    summary_details?: string
    modify_btn?: string
    private_badge?: string
    group_badge?: string
    summary_departure?: string
    summary_people?: string
    summary_total?: string
    slot_required?: string
    payment_stripe_not_confirmed?: string
    payment_stripe_verify_failed?: string
    payment_paypal_capture_failed?: string
    payment_countdown_title?: string
    payment_countdown_label?: string
    payment_countdown_helper?: string
    payment_countdown_expired?: string
    payment_restart_btn?: string
} & Record<string, string | undefined>

type BookingWidgetDict = {
    widget?: BookingWidgetCopy
    title?: string
    subtitle?: string
} & Record<string, unknown>

type GroupFormCopy = {
    title?: string
    placeholder_message?: string
    sent_title?: string
    sent_message?: string
    sent_button?: string
} & Record<string, string | undefined>

type PrivateFormCopy = {
    title?: string
    message_label?: string
    placeholder_message?: string
} & Record<string, string | undefined>

interface WizardProps {
    dict: {
        booking?: BookingWidgetDict
        group_form?: GroupFormCopy
        private_form?: PrivateFormCopy
    } & Record<string, unknown>
    initialLang: Lang
}

// Les étapes du tunnel
const STEPS = {
    CRITERIA: 1,      // Choix date & personnes
    SLOTS: 2,         // Choix horaire
    CONTACT: 3,       // Formulaire final (coordonnées)
    PAYMENT: 4,       // Étape paiement
    SUCCESS: 5,       // Confirmation
    GROUP_CONTACT: 6, // Formulaire spécial groupe (>12)
    GROUP_SUCCESS: 7, // Confirmation groupe
    PRIVATE_CONTACT: 8, // Formulaire spécial privatisation
    PRIVATE_SUCCESS: 9  // Confirmation privatisation
}

export default function BookingWizard({ dict, initialLang }: WizardProps) {
  // --- ÉTATS ---
  const [step, setStep] = useState(STEPS.CRITERIA)
    const [globalErrors, setGlobalErrors] = useState<string[]>([])
    const bookingDict = useMemo(() => (dict.booking ?? {}) as BookingWidgetDict, [dict])
    const widgetCopy = useMemo(() => (bookingDict.widget ?? {}) as BookingWidgetCopy, [bookingDict])
    const groupFormCopy = useMemo(() => (dict.group_form ?? {}) as GroupFormCopy, [dict])
    const privateFormCopy = useMemo(() => (dict.private_form ?? {}) as PrivateFormCopy, [dict])
    const countdownHelperText = useMemo(() => {
        const template = widgetCopy.payment_countdown_helper || 'Vos places sont bloquées pendant {minutes} min à partir de cette étape.'
        return template.replace('{minutes}', String(PAYMENT_TIMEOUT_MINUTES))
    }, [widgetCopy])
  
  // Analytics funnel tracking
  const funnel = useFunnelTracking()
  
  // Données de réservation
    // Date locale (YYYY-MM-DD) pour éviter tout décalage de fuseau
    const getTodayLocalISO = () => {
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }
    const todayLocalISO = getTodayLocalISO()
    const [date, setDate] = useState<string>(todayLocalISO)
  const [language, setLanguage] = useState<string>(initialLang.toUpperCase())
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [babies, setBabies] = useState(0)
    const [isPrivate] = useState(false) // Option barque privative
    const [contactOpen, setContactOpen] = useState(false)
    const [contactMode, setContactMode] = useState<'group'|'private'>('group')
  
  // API & Slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [blockedReason, setBlockedReason] = useState<string | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  
  // Contact & Formulaires
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' })
    const [phoneCode, setPhoneCode] = useState('+33')
    const [phoneCodeInput, setPhoneCodeInput] = useState('+33') // manual input value
    const [phoneCodeError, setPhoneCodeError] = useState<string | null>(null)
    const [phoneError, setPhoneError] = useState<string | null>(null)

    const [pendingBookingId, setPendingBookingId] = useState<string | null>(null)
    const [pendingSignature, setPendingSignature] = useState<string | null>(null)
    const [pendingExpiresAt, setPendingExpiresAt] = useState<string | null>(null)
    const [pendingSecondsLeft, setPendingSecondsLeft] = useState<number | null>(null)
    const [pendingExpired, setPendingExpired] = useState(false)
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const recaptchaRef = useRef<ReCAPTCHA>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [stripeError, setStripeError] = useState<string | null>(null)
    const [initializingStripe, setInitializingStripe] = useState(false)
    const [paymentSucceeded, setPaymentSucceeded] = useState<boolean>(false)
        const [paymentProvider, setPaymentProvider] = useState<null | 'stripe' | 'paypal'>(null)
    const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null)
        const [stripeIntentId, setStripeIntentId] = useState<string | null>(null)
    const widgetRef = useRef<HTMLDivElement | null>(null)
    const initialStepRender = useRef(true)
    const expirationHandledRef = useRef(false)

    const validateLocalPhone = (digits: string) => {
        if (!digits) return 'Numéro requis'
        if (!isPossibleLocalDigits(digits)) {
            if (digits.length < 6) return 'Trop court'
            return 'Trop long'
        }
        return null
    }

    const sanitizePhoneCode = (raw: string) => {
        if (!raw) return ''
        let v = raw.replace(/[^+0-9]/g,'')
        if (!v.startsWith('+')) v = '+' + v.replace(/^\+/, '')
        return v
    }

    const buildE164 = useCallback(() => localToE164(phoneCode, formData.phone), [phoneCode, formData.phone])
    const getFormattedPhone = useCallback(() => formatInternational(buildE164()), [buildE164])
    const releasePendingBooking = useCallback(async (bookingId: string) => {
        try {
            await fetch('/api/bookings/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId })
            })
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error)
            console.warn('Unable to release pending booking:', msg)
        }
    }, [])
    const ensurePendingBooking = useCallback(async (): Promise<string> => {
        if (pendingBookingId && pendingExpiresAt) {
            const expiresAt = new Date(pendingExpiresAt).getTime()
            if (expiresAt > Date.now()) return pendingBookingId
            await releasePendingBooking(pendingBookingId)
            setPendingBookingId(null)
        }
        if (!captchaToken) {
            const captchaMsg = widgetCopy.captcha_required || 'Captcha requis'
            setGlobalErrors([captchaMsg])
            setStep(STEPS.CONTACT)
            throw new Error(captchaMsg)
        }
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date,
                time: selectedSlot,
                adults,
                children,
                babies,
                language,
                userDetails: { ...formData, phone: buildE164() },
                captchaToken,
                pendingOnly: true
            })
        })
        const payload = await response.json()
        const widgetDict = widgetCopy
        if (!response.ok) {
            const message = payload?.error || widgetDict?.booking_create_failed || 'Impossible de créer la réservation'
            setGlobalErrors([message])
            if (/captcha/i.test(message)) {
                setStep(STEPS.CONTACT)
            }
            throw new Error(message)
        }
        const newId: string | null = payload.bookingId || null
        if (!newId) {
            const notFound = widgetDict?.booking_not_found || 'Réservation introuvable'
            setGlobalErrors([notFound])
            throw new Error(notFound)
        }
        const expiresAtIso = typeof payload?.pendingExpiresAt === 'string'
            ? payload.pendingExpiresAt
            : (payload?.booking?.createdAt
                ? new Date(new Date(payload.booking.createdAt).getTime() + (PAYMENT_TIMEOUT_MINUTES * 60 * 1000)).toISOString()
                : null)
        setPendingBookingId(newId)
        setPendingSignature(`${date}|${selectedSlot || ''}|${adults}|${children}|${babies}`)
        setPendingExpiresAt(expiresAtIso)
        setPendingExpired(false)
        setPendingSecondsLeft(null)
        expirationHandledRef.current = false
        return newId
    }, [adults, babies, buildE164, captchaToken, children, date, formData, language, pendingBookingId, pendingExpiresAt, releasePendingBooking, selectedSlot, widgetCopy])

    const initializeStripeIntent = useCallback(async () => {
        if (initializingStripe) return
        setStripeError(null)
        setInitializingStripe(true)
        try {
            const bookingId = await ensurePendingBooking()
            const res = await fetch('/api/payments/create-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId })
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data?.clientSecret) {
                const fallback = widgetCopy.payment_error_generic || 'Erreur paiement'
                throw new Error(data?.error || fallback)
            }
            setClientSecret(data.clientSecret)
            setPaymentProvider('stripe')
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error)
            const fallback = widgetCopy.payment_error_generic || 'Erreur paiement'
            setStripeError(msg || fallback)
        } finally {
            setInitializingStripe(false)
        }
    }, [ensurePendingBooking, initializingStripe, widgetCopy])

    const handlePendingExpiration = useCallback(async () => {
        if (!pendingBookingId) return
        expirationHandledRef.current = true
        try {
            await releasePendingBooking(pendingBookingId)
        } finally {
            setPendingBookingId(null)
            setPendingSignature(null)
            setPendingExpiresAt(null)
            setPendingSecondsLeft(null)
            setPendingExpired(true)
            setPaymentProvider(null)
            setPaymentSucceeded(false)
            setClientSecret(null)
            setStripeIntentId(null)
            setPaypalOrderId(null)
            const expiredMsg = widgetCopy.payment_countdown_expired || 'Votre session de paiement a expiré. Relancez le paiement pour conserver vos places.'
            setGlobalErrors([expiredMsg])
        }
    }, [pendingBookingId, releasePendingBooking, widgetCopy])

    useEffect(() => {
        if (step !== STEPS.PAYMENT) return
        if (clientSecret || pendingExpired) return
        initializeStripeIntent().catch(() => {
            /* Errors surfaced via stripeError state */
        })
    }, [step, clientSecret, initializeStripeIntent, pendingExpired])

  // Calculs
  const totalPeople = adults + children + babies
    const isGroup = totalPeople > GROUP_THRESHOLD // Bascule automatiquement en mode Groupe
    const totalPrice = (adults * PRICES.ADULT) + (children * PRICES.CHILD) + (babies * PRICES.BABY)
                const countdownTotalSeconds = PAYMENT_TIMEOUT_MINUTES * 60
        const progressSegments = [
            { id: STEPS.CRITERIA, label: widgetCopy.step_criteria_short || widgetCopy.step_criteria_title || 'Critères' },
            { id: STEPS.SLOTS, label: widgetCopy.step_slots_short || widgetCopy.step_slots_title || 'Horaires' },
            { id: STEPS.CONTACT, label: widgetCopy.step_contact_short || widgetCopy.form_title || 'Contact' },
            { id: STEPS.PAYMENT, label: widgetCopy.payment_title || 'Paiement' }
        ]
        const orderedSteps = progressSegments.map(segment => segment.id)
        const stepForProgress = step >= STEPS.SUCCESS ? STEPS.PAYMENT : Math.min(step, STEPS.PAYMENT)
        const matchedIndex = orderedSteps.findIndex((ordered) => ordered === stepForProgress)
        const currentStepIndex = matchedIndex === -1
            ? (stepForProgress >= orderedSteps[orderedSteps.length - 1] ? orderedSteps.length - 1 : 0)
            : matchedIndex
        const progressRatio = orderedSteps.length > 1
            ? currentStepIndex / (orderedSteps.length - 1)
            : 1

  // Reset des créneaux si on change les critères
  useEffect(() => {
    setSelectedSlot(null)
    setAvailableSlots([])
  }, [date, adults, children, babies])

    // Auto-detect country calling code once (if user hasn't modified input manually)
    useEffect(() => {
        let aborted = false
        const detect = async () => {
            try {
                // Skip if user already changed code manually
                if (phoneCodeInput !== '+33') return
                const res = await fetch('/api/geo/phone-code')
                if (!res.ok) return
                const data = await res.json()
                if (aborted) return
                if (data?.dialCode && /^\+[1-9]\d{1,3}$/.test(data.dialCode)) {
                    setPhoneCode(data.dialCode)
                    setPhoneCodeInput(data.dialCode)
                }
            } catch {
                // Silent failure
            }
        }
        detect()
        return () => { aborted = true }
    }, [phoneCodeInput])

    useEffect(() => {
        if (step === STEPS.PAYMENT) {
            ensurePendingBooking().catch(() => {
                // L'étape paiement affichera déjà les erreurs via ensurePendingBooking
            })
        }
    }, [ensurePendingBooking, step])

    useEffect(() => {
        expirationHandledRef.current = false
    }, [pendingExpiresAt])

    useEffect(() => {
        if (!pendingExpiresAt) {
            setPendingSecondsLeft(null)
            return
        }
        const expiresAt = new Date(pendingExpiresAt).getTime()
        const tick = () => {
            const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
            setPendingSecondsLeft(remaining)
            if (remaining <= 0 && pendingBookingId && !expirationHandledRef.current) {
                expirationHandledRef.current = true
                handlePendingExpiration().catch(() => {
                    /* errors already surfaced */
                })
            }
        }
        tick()
        const interval = window.setInterval(tick, 1000)
        return () => window.clearInterval(interval)
    }, [handlePendingExpiration, pendingBookingId, pendingExpiresAt])

    useEffect(() => {
        if (initialStepRender.current) {
            initialStepRender.current = false
            return
        }
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            widgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [step])

    useEffect(() => {
        if (!pendingBookingId || !pendingSignature) return
        const currentSignature = selectedSlot ? `${date}|${selectedSlot}|${adults}|${children}|${babies}` : null
        if (currentSignature && currentSignature === pendingSignature) return
        let cancelled = false
        const release = async () => {
            try {
                await releasePendingBooking(pendingBookingId)
            } finally {
                if (cancelled) return
                setPendingBookingId(null)
                setPendingSignature(null)
                setPendingExpiresAt(null)
                setPendingSecondsLeft(null)
                setPendingExpired(false)
                setClientSecret(null)
                setStripeIntentId(null)
                setPaypalOrderId(null)
                setPaymentProvider(null)
                setPaymentSucceeded(false)
            }
        }
        release()
        return () => {
            cancelled = true
        }
    }, [adults, babies, children, date, pendingBookingId, pendingSignature, releasePendingBooking, selectedSlot])

    useEffect(() => {
        return () => {
            if (pendingBookingId) {
                releasePendingBooking(pendingBookingId).catch(() => {
                    /* noop */
                })
            }
        }
    }, [pendingBookingId, releasePendingBooking])

  // --- ACTIONS DU TUNNEL ---

  // ÉTAPE 1 -> SUIVANT
  const handleSearch = async () => {
        if (totalPeople === 0) { setGlobalErrors(["Veuillez sélectionner au moins une personne."]); return }
        setGlobalErrors([])
    
    // Si c'est un groupe (>12), direction formulaire groupe
    if (isGroup) {
        setStep(STEPS.GROUP_CONTACT)
        return
    }

    // Si demande de privatisation, direction formulaire privatif
    if (isPrivate) {
        setStep(STEPS.PRIVATE_CONTACT)
        return
    }

    // Sinon, recherche classique de créneaux
    setLoading(true)
        try {
                const res = await fetch(`/api/availability?date=${date}&adults=${adults}&children=${children}&babies=${babies}&lang=${language}`)
                const data = await res.json()

                // Filtre côté client: si la date recherchée est aujourd'hui (local),
                // on masque les créneaux déjà passés en se basant sur l'heure locale.
                const slots: string[] = data.availableSlots || []
                setBlockedReason(data.blockedReason)
                const now = new Date()
                const pad = (n: number) => String(n).padStart(2, '0')
                const todayLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

                let filtered = slots
                if (date === todayLocal) {
                    const nowMinutes = now.getHours() * 60 + now.getMinutes()
                    filtered = slots.filter((s) => {
                        const [h, m] = s.split(':').map(Number)
                        const mins = (h * 60) + m
                        return mins >= nowMinutes + MIN_BOOKING_DELAY_MINUTES
                    })
                }

                setAvailableSlots(filtered)
                setStep(STEPS.SLOTS)
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(msg)
        setGlobalErrors(["Erreur technique lors de la recherche. Veuillez réessayer."])
    } finally {
        setLoading(false)
    }
  }

    // PASSAGE À L'ÉTAPE PAIEMENT (vérification coordonnées + captcha)
    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!captchaToken) { setGlobalErrors(["Veuillez cocher la case 'Je ne suis pas un robot'."]); return }
        if (!selectedSlot) { setGlobalErrors([widgetCopy.slot_required || 'Veuillez sélectionner un créneau.']); return }
        if (phoneError || phoneCodeError) { setGlobalErrors(['Veuillez corriger le numéro de téléphone.']); return }

        // Track form completion
        funnel.formFilled({
            language,
            date,
            timeSlot: selectedSlot,
            passengers: adults + children + babies,
            adults,
            children,
            babies,
            isPrivate
        })

        setIsSubmitting(true)
        try {
            await ensurePendingBooking()
            setPaymentProvider(null)
            setStripeIntentId(null)
            setPaypalOrderId(null)
            setStripeError(null)
            setPaymentSucceeded(false)
            setGlobalErrors([])
            setStep(STEPS.PAYMENT)
        } catch {
            // ensurePendingBooking gère déjà l'affichage d'erreurs explicites
        } finally {
            setIsSubmitting(false)
        }
    }

    const handlePaymentBack = () => {
        setPaymentProvider(null)
        setPaymentSucceeded(false)
        setStripeIntentId(null)
        setPaypalOrderId(null)
        setClientSecret(null)
        setStripeError(null)
        setStep(STEPS.CONTACT)
    }

    // VALIDATION STANDARD (confirmation finale)
    const handleBookingSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
                                if (!captchaToken) { setGlobalErrors(["Veuillez cocher la case 'Je ne suis pas un robot'."]); return }
                                if (!paymentSucceeded) { setGlobalErrors(["Veuillez finaliser le paiement avant confirmation."]); return }
                                if (pendingExpired) {
                                    setGlobalErrors([widgetCopy.payment_countdown_expired || 'La réservation temporaire a expiré. Relancez le paiement.'])
                                    return
                                }
    
    setIsSubmitting(true)
    try {
        // If Stripe flow with pending booking, verify and finish
        if (paymentProvider === 'stripe' && stripeIntentId && pendingBookingId) {
            try {
                const confirmRes = await fetch('/api/bookings/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId: pendingBookingId, provider: 'stripe', intentId: stripeIntentId })
                })
                const confirm = await confirmRes.json().catch(() => ({}))
                if (!confirmRes.ok || confirm?.success !== true) {
                    const defaultMsg = (widgetCopy.payment_stripe_not_confirmed || 'Paiement Stripe non confirmé. Statut: {status}').replace('{status}', 'inconnu')
                    const message = typeof confirm?.error === 'string' ? confirm.error : defaultMsg
                    setGlobalErrors([message])
                    setIsSubmitting(false)
                    return
                }
            } catch {
                setGlobalErrors([widgetCopy.payment_stripe_verify_failed || 'Impossible de vérifier le paiement Stripe.'])
                setIsSubmitting(false)
                return
            }
            // Track booking confirmation (Stripe)
            funnel.bookingConfirmed({
                language,
                date,
                timeSlot: selectedSlot || undefined,
                passengers: adults + children + babies,
                adults,
                children,
                babies,
                totalPrice,
                isPrivate,
                method: 'stripe',
                bookingId: pendingBookingId || undefined
            })
            setGlobalErrors([])
            setPendingBookingId(null)
            setPendingSignature(null)
            setPendingExpiresAt(null)
            setPendingSecondsLeft(null)
            setPendingExpired(false)
            setPaymentProvider(null)
            setStripeIntentId(null)
            setPaypalOrderId(null)
            setStep(STEPS.SUCCESS)
            return
        }

        // If PayPal flow with pending booking already captured, just finish
        if (paymentProvider === 'paypal' && pendingBookingId && paymentSucceeded) {
            // Track booking confirmation (PayPal)
            funnel.bookingConfirmed({
                language,
                date,
                timeSlot: selectedSlot || undefined,
                passengers: adults + children + babies,
                adults,
                children,
                babies,
                totalPrice,
                isPrivate,
                method: 'paypal',
                bookingId: pendingBookingId || undefined
            })
            setGlobalErrors([])
            setPendingBookingId(null)
            setPendingSignature(null)
            setPendingExpiresAt(null)
            setPendingSecondsLeft(null)
            setPendingExpired(false)
            setPaymentProvider(null)
            setStripeIntentId(null)
            setPaypalOrderId(null)
            setStep(STEPS.SUCCESS)
            return
        }
        // 👇 CORRECTION ICI : '/api/bookings' (pluriel) au lieu de '/api/booking'
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date,
                time: selectedSlot,
                adults,
                children,
                babies,
                language,
                userDetails: { ...formData, phone: buildE164() },
                captchaToken,
                isPaid: true,
                payment: { provider: paymentProvider || 'stripe', method: paymentProvider === 'paypal' ? 'paypal_button' : 'payment_element', intentId: stripeIntentId || undefined, orderId: paypalOrderId || undefined }
            })
        })
        
        if (res.ok) {
            const result = await res.json().catch(()=>({}))
            const newBookingId = result?.bookingId
            // If PayPal was used, attach/capture and link payment to booking
            if (paymentProvider === 'paypal' && paypalOrderId && newBookingId) {
                try {
                    const cap = await fetch('/api/payments/paypal/capture-order', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: paypalOrderId, bookingId: newBookingId })
                    })
                        if (!cap.ok) {
                            const capData = await cap.json().catch(()=>({}))
                            const capMessage = capData?.error || (widgetCopy.payment_paypal_capture_failed || 'Capture PayPal échouée')
                            setGlobalErrors([capMessage])
                        setIsSubmitting(false)
                        return
                    }
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error)
                    console.error('PayPal capture failed:', msg)
                    setGlobalErrors(["Erreur réseau lors de l'association PayPal."])
                    setIsSubmitting(false)
                    return
                }
            }
            setGlobalErrors([])
            setPendingBookingId(null)
            setPendingSignature(null)
            setPendingExpiresAt(null)
            setPendingSecondsLeft(null)
            setPendingExpired(false)
            setPaymentProvider(null)
            setStripeIntentId(null)
            setPaypalOrderId(null)
            setStep(STEPS.SUCCESS)
        } else {
            const err = await res.json().catch(()=>({error:'Erreur inconnue'}))
            setGlobalErrors(["Erreur: " + err.error])
            recaptchaRef.current?.reset()
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(msg)
        setGlobalErrors(["Erreur de connexion (vérifiez votre réseau ou contactez le support)"])
    } finally {
        setIsSubmitting(false)
    }
  }

  // Composant Compteur
        type CounterProps = { label?: string; value: number; setter: (n: number) => void; price?: string }
    const Counter = ({ label, value, setter, price }: CounterProps) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <div>
                <span className="block text-sm font-bold text-slate-700">{label || ''}</span>
                <span className="text-xs text-slate-400">{price || ''}</span>
      </div>
      <div className="flex items-center bg-slate-100 rounded-lg">
        <button onClick={() => setter(Math.max(0, value - 1))} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-l-lg font-bold transition">-</button>
        <span className="w-8 text-center text-sm font-bold text-slate-800">{value}</span>
        <button onClick={() => setter(value + 1)} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-lg font-bold transition">+</button>
      </div>
    </div>
  )

  // TITRES DYNAMIQUES
  const getMainTitle = () => {
    if (isGroup) return groupFormCopy.title?.replace('{people}', String(totalPeople))
    if (isPrivate) return privateFormCopy.title
        return widgetCopy.summary_title_standard || bookingDict.title
  }

    return (
        <div ref={widgetRef} className="max-w-6xl mx-auto sn-card overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* === COLONNE GAUCHE : RÉCAPITULATIF === */}
        <div className="bg-[#0f172a] p-8 text-white md:w-1/3 flex flex-col relative transition-all duration-500 order-2 md:order-1">
            <h3 className="text-2xl font-serif text-[#0ea5e9] mb-6">
                {getMainTitle()}
            </h3>
            
            {/* Barre de progression */}
            <div className="mb-6 h-2 w-full rounded-full bg-slate-800">
                <div
                    className="h-full rounded-full bg-[#0ea5e9] transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(0, Math.min(1, progressRatio)) * 100}%` }}
                    aria-hidden="true"
                />
            </div>
            <ol className="mb-8 w-full space-y-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500" aria-label={widgetCopy.progress_label || 'Progression de la réservation'}>
                {progressSegments.map((segment, index) => {
                    const isReached = step >= STEPS.SUCCESS || currentStepIndex >= index
                    const nextReached = step >= STEPS.SUCCESS || currentStepIndex > index
                    return (
                        <li key={segment.id} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                                <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${isReached ? 'border-[#0ea5e9] bg-[#0ea5e9] text-[#0f172a]' : 'border-slate-600 bg-slate-800 text-slate-400'}`}>{index + 1}</div>
                                {index < progressSegments.length - 1 && (
                                    <div className={`mt-1 w-px flex-1 min-h-[28px] rounded-full ${nextReached ? 'bg-[#0ea5e9]' : 'bg-slate-700'}`} aria-hidden="true" />
                                )}
                            </div>
                            <div className={`pt-1 ${isReached ? 'text-[#0ea5e9]' : 'text-slate-500'}`}>
                                {segment.label}
                            </div>
                        </li>
                    )
                })}
            </ol>

            <div className="space-y-4 flex-1">
                {/* BLOC 1 : DATE & PAX */}
                <div className={`p-4 rounded-xl border transition-all ${step === STEPS.CRITERIA ? 'border-[#0ea5e9] bg-slate-800 shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'border-slate-700 bg-transparent'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs uppercase font-bold text-slate-400">{widgetCopy.summary_details}</span>
                        {step > STEPS.CRITERIA && <button onClick={() => setStep(STEPS.CRITERIA)} className="text-[10px] text-[#0ea5e9] underline hover:text-white">{widgetCopy.modify_btn}</button>}
                    </div>
                                        <div className="font-semibold text-lg text-white">
                                                {(() => {
                                                    const [y, m, d] = date.split('-').map(Number)
                                                    const wall = new Date(Date.UTC(y, m - 1, d))
                                                    return wall.toLocaleDateString(initialLang === 'fr' ? 'fr-FR' : initialLang === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                                                })()}
                                        </div>
                    <div className="text-sm text-slate-300 mt-1">
                        {totalPeople} pers. <span className="text-slate-500 mx-1">•</span> {language}
                    </div>
                    
                    {!isGroup && !isPrivate ? (
                        <div className="text-[#38bdf8] font-bold text-xl mt-2">{totalPrice},00 €</div>
                    ) : (
                        <div className="mt-2 inline-block px-2 py-1 rounded bg-blue-900/50 text-blue-200 text-xs font-bold border border-blue-500/30">
                            {isPrivate ? "✨ " + widgetCopy.private_badge : "👥 " + widgetCopy.group_badge}
                        </div>
                    )}
                </div>

                {/* BLOC 2 : HORAIRE */}
                {selectedSlot && !isGroup && !isPrivate && (
                    <div className={`p-4 rounded-xl border transition-all animate-in fade-in slide-in-from-left-4 ${step === STEPS.SLOTS ? 'border-[#0ea5e9] bg-slate-800' : 'border-slate-700'}`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs uppercase font-bold text-slate-400">{widgetCopy.summary_departure}</span>
                            {step > STEPS.SLOTS && step < STEPS.SUCCESS && <button onClick={() => setStep(STEPS.SLOTS)} className="text-[10px] text-[#0ea5e9] underline hover:text-white">{widgetCopy.modify_btn}</button>}
                        </div>
                        <div className="font-bold text-2xl text-[#38bdf8]">{selectedSlot}</div>
                        <div className="text-xs text-slate-400 mt-1">{widgetCopy.duration_text}</div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-xs text-slate-500 border-t border-slate-800 pt-4">
                <p>{widgetCopy.help_text}</p>
                <p className="text-slate-400 mt-1">📞 +33 3 89 20 68 92</p>
            </div>
        </div>

        {/* === COLONNE DROITE === */}
        <div className="p-8 md:w-2/3 bg-slate-50 relative flex flex-col order-1 md:order-2">
            {globalErrors.length > 0 && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded" role="alert" aria-live="polite">
                    <ul className="list-disc pl-4">
                        {globalErrors.map((er,i)=>(<li key={i}>{er}</li>))}
                    </ul>
                </div>
            )}
            
            {/* --- ÉTAPE 1 : CRITÈRES --- */}
            {step === STEPS.CRITERIA && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{widgetCopy.step_criteria_title}</h2>
                    <p className="text-slate-500 mb-6 text-sm">{bookingDict.subtitle}</p>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 flex-1">
                        <div>
                            <label htmlFor="bw-date" className="block text-xs font-bold uppercase text-slate-500 mb-2">{widgetCopy.date}</label>
                            <input
                                id="bw-date"
                                type="date"
                                value={date}
                                min={todayLocalISO}
                                onChange={(e) => {
                                  const v = e.target.value
                                  // Bloque les dates passées côté client
                                  if (v && v < todayLocalISO) setDate(todayLocalISO)
                                  else setDate(v)
                                }}
                                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#0ea5e9] outline-none transition"
                            />
                        </div>

                        <div>
                            <span id="bw-passengers-label" className="block text-xs font-bold uppercase text-slate-500 mb-2">{widgetCopy.passengers}</span>
                            <div className="space-y-1" role="group" aria-labelledby="bw-passengers-label">
                                <Counter label={widgetCopy.adults} price={`${PRICES.ADULT}€`} value={adults} setter={setAdults} />
                                <Counter label={widgetCopy.children} price={`${PRICES.CHILD}€`} value={children} setter={setChildren} />
                                <Counter label={widgetCopy.babies} price={widgetCopy.free} value={babies} setter={setBabies} />
                            </div>
                        </div>

                                                {/* Replace inline private toggle with modal triggers */}
                                                <div className="flex gap-3 justify-center mt-2">
                                                    <button type="button" className="px-3 py-2 text-sm rounded border border-slate-200 hover:bg-slate-50"
                                                        onClick={()=>{ setContactMode('group'); setContactOpen(true) }}>
                                                        👥 {widgetCopy.group_badge}
                                                    </button>
                                                    <button type="button" className="px-3 py-2 text-sm rounded border border-slate-200 hover:bg-slate-50"
                                                        onClick={()=>{ setContactMode('private'); setContactOpen(true) }}>
                                                        ✨ {widgetCopy.private_toggle_title}
                                                    </button>
                                                </div>

                        <div>
                            <span id="bw-language-label" className="block text-xs font-bold uppercase text-slate-500 mb-2">{widgetCopy.language}</span>
                            <div className="flex gap-2" role="group" aria-labelledby="bw-language-label">
                                {['FR', 'EN', 'DE'].map(lang => (
                                    <button key={lang} onClick={() => setLanguage(lang)}
                                        aria-pressed={language === lang}
                                        className={`flex-1 py-2 rounded-lg font-bold border transition-all text-sm ${language === lang ? 'border-[#0ea5e9] bg-sky-50 text-slate-900 shadow-sm' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'}`}>
                                        {lang === 'FR' ? '🇫🇷' : lang === 'EN' ? '🇬🇧' : '🇩🇪'} {lang}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button onClick={handleSearch} disabled={loading} 
                            className="btn-interactive btn-haptic w-full bg-[#0ea5e9] text-[#0f172a] py-4 rounded-xl font-bold text-lg hover:bg-sky-400 transition-all shadow-lg flex items-center justify-center gap-2">
                            {loading ? <span className="animate-spin">⏳</span> : null}
                            {loading ? widgetCopy.loading : isGroup ? widgetCopy.btn_continue_group : isPrivate ? widgetCopy.btn_continue_private : widgetCopy.btn_search}
                        </button>
                    </div>
                </div>
            )}

            {/* --- ÉTAPE 2 : HORAIRES --- */}
            {step === STEPS.SLOTS && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setStep(STEPS.CRITERIA)} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 w-fit">← {widgetCopy.back_btn || "Retour"}</button>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{widgetCopy.step_slots_title}</h2>
                    <p className="text-slate-500 mb-6 text-sm">{widgetCopy.slots_subtitle} {(() => { const [y,m,d] = date.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)).toLocaleDateString(); })()}.</p>
                    
                    <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        {availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                                {availableSlots.map(slot => (
                                    <button key={slot} onClick={() => {
                                        setSelectedSlot(slot)
                                        funnel.slotSelected({ language, date, timeSlot: slot })
                                    }}
                                        className={`py-3 rounded-lg border font-bold transition-all ${selectedSlot === slot ? 'border-[#0f172a] bg-[#0f172a] text-[#38bdf8] shadow-md transform scale-105' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-[#0ea5e9] hover:bg-white'}`}>
                                        {slot}
                                    </button>
                                ))}
                            </div>
                            

                                                ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl mb-3">📅</span>
                                <h3 className="font-bold text-slate-800">
                                  {date === todayLocalISO ? 'Plus de départs aujourd\'hui' : (widgetCopy.no_slot || 'Aucun créneau disponible')}
                                </h3>
                                                                {blockedReason && (
                                                                    <p className="text-sm text-slate-500 mt-1">{blockedReason}</p>
                                                                )}
                                                                {date === todayLocalISO && !blockedReason && (
                                  <p className="text-sm text-slate-500 mt-1">Revenez demain ou choisissez une autre date.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                                 <button onClick={() => setStep(STEPS.CONTACT)} disabled={!selectedSlot} 
                                     className={`btn-interactive btn-haptic w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${selectedSlot ? 'bg-[#0ea5e9] text-[#0f172a] hover:bg-sky-400' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                            {widgetCopy.btn_validate_slot} →
                        </button>
                    </div>
                </div>
            )}

            {/* --- ÉTAPE 3 / CONTACT --- */}
            {(step === STEPS.CONTACT) && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setStep(step === STEPS.CONTACT ? STEPS.SLOTS : STEPS.CRITERIA)} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 w-fit">← {widgetCopy.back_btn || "Retour"}</button>
                    
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                        {step === STEPS.PRIVATE_CONTACT ? privateFormCopy.title : widgetCopy.form_title}
                    </h2>
                    <p className="text-slate-500 mb-6 text-sm">
                        {step === STEPS.PRIVATE_CONTACT 
                            ? privateFormCopy.subtitle 
                            : widgetCopy.form_subtitle || "Complete your details"}
                    </p>
                    
                    <form 
                        onSubmit={handleContactSubmit} 
                        className="form-progressive flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-field-wrapper">
                                <label htmlFor="bw-firstName" className="text-xs font-bold uppercase text-slate-500">{groupFormCopy.placeholder_firstname}</label>
                                <input id="bw-firstName" required className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#0ea5e9] outline-none transition-all duration-300" 
                                    value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                            </div>
                            <div className="form-field-wrapper">
                                <label htmlFor="bw-lastName" className="text-xs font-bold uppercase text-slate-500">{groupFormCopy.placeholder_lastname}</label>
                                <input id="bw-lastName" required className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#0ea5e9] outline-none transition-all duration-300" 
                                    value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                            </div>
                        </div>
                        
                        <div className="form-field-wrapper">
                            <label htmlFor="bw-email" className="text-xs font-bold uppercase text-slate-500">{groupFormCopy.placeholder_email}</label>
                            <input id="bw-email" required type="email" className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#0ea5e9] outline-none transition-all duration-300" 
                                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        
                                                <div>
                                                        <label id="bw-phone-label" className="text-xs font-bold uppercase text-slate-500">{groupFormCopy.placeholder_phone}</label>
                                                        <div className="flex gap-2 mt-1 items-start" role="group" aria-labelledby="bw-phone-label">
                                                            <div className="flex flex-col w-40">
                                                                <input
                                                                    aria-label="Indicatif téléphonique"
                                                                    list="phoneCodes"
                                                                    value={phoneCodeInput}
                                                                    onChange={e => {
                                                                        const raw = e.target.value
                                                                        setPhoneCodeInput(raw)
                                                                        const sanitized = sanitizePhoneCode(raw)
                                                                        // if matches known code pick its canonical formatting
                                                                        const match = PHONE_CODES.find(pc => pc.code === sanitized)
                                                                        setPhoneCode(match ? match.code : sanitized)
                                                                        if (!/^\+[1-9]\d{1,3}$/.test(sanitized)) {
                                                                            setPhoneCodeError('Indicatif invalide')
                                                                        } else {
                                                                            setPhoneCodeError(null)
                                                                        }
                                                                    }}
                                                                    placeholder="+1"
                                                                    className={`p-3 border rounded-lg bg-white focus:ring-2 outline-none text-sm ${phoneCodeError ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-[#0ea5e9]'}`}
                                                                />
                                                                <datalist id="phoneCodes">
                                                                    {PHONE_CODES.map(pc => (
                                                                        <option key={pc.code} value={pc.code}>{pc.country}</option>
                                                                    ))}
                                                                </datalist>
                                                                {phoneCodeError && <p className="text-[10px] text-red-500 mt-1">{phoneCodeError}</p>}
                                                            </div>
                                                            <div className="flex-1">
                                                                <input
                                                                    required
                                                                    type="tel"
                                                                    inputMode="tel"
                                                                    aria-label="Numéro de téléphone"
                                                                    className={`w-full p-3 border rounded-lg bg-white focus:ring-2 outline-none ${phoneError ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-[#0ea5e9]'}`}
                                                                    value={formData.phone}
                                                                    onChange={e => {
                                                                        const digits = e.target.value.replace(/[^0-9]/g,'')
                                                                        setFormData({ ...formData, phone: digits })
                                                                        const localErr = validateLocalPhone(digits)
                                                                        // library validation if basic passes
                                                                        if (localErr) { setPhoneError(localErr); return }
                                                                        const e164 = localToE164(phoneCode, digits)
                                                                        setPhoneError(isValidE164(e164) ? null : 'Format international invalide')
                                                                    }}
                                                                    onBlur={() => {
                                                                        const localErr = validateLocalPhone(formData.phone)
                                                                        if (localErr) return setPhoneError(localErr)
                                                                        const e164 = buildE164()
                                                                        setPhoneError(isValidE164(e164) ? null : 'Format international invalide')
                                                                    }}
                                                                />
                                                                <div className="flex justify-between mt-1">
                                                                    <p className="text-[10px] text-slate-400">{getFormattedPhone()}</p>
                                                                    {phoneError && <p className="text-[10px] text-red-500">{phoneError}</p>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                </div>

                        {(step === STEPS.GROUP_CONTACT || step === STEPS.PRIVATE_CONTACT) && (
                             <div>
                                <label htmlFor="bw-message" className="text-xs font-bold uppercase text-slate-500">{privateFormCopy.message_label || "Message"}</label>
                                <textarea id="bw-message" className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#0ea5e9] outline-none h-20" 
                                    placeholder={step === STEPS.PRIVATE_CONTACT ? privateFormCopy.placeholder_message : groupFormCopy.placeholder_message}
                                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                            </div>
                        )}

                                                <div className="bg-slate-100 p-4 rounded-xl flex justify-center overflow-x-auto">
                                                        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? (
                                                            <div className="mx-auto scale-[0.9] origin-top sm:scale-100 sm:origin-center">
                                                                <ReCAPTCHA
                                                                    ref={recaptchaRef}
                                                                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                                                                    onChange={(token) => setCaptchaToken(token)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-slate-500">reCAPTCHA non configuré</div>
                                                        )}
                                                </div>
                        
                        <button type="submit" disabled={isSubmitting || !!phoneError || !!phoneCodeError} 
                            className="btn-interactive btn-haptic w-full bg-[#0ea5e9] text-[#0f172a] py-4 rounded-xl font-bold text-lg hover:bg-sky-400 transition-all shadow-lg mt-4">
                            {isSubmitting ? widgetCopy.submitting : (widgetCopy.btn_go_to_payment || 'Continuer vers le paiement')}
                        </button>
                    </form>
                </div>
            )}

            {/* --- ÉTAPE 4 : PAIEMENT --- */}
            {step === STEPS.PAYMENT && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <button onClick={handlePaymentBack} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 w-fit">← {widgetCopy.back_btn || 'Retour'}</button>

                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{widgetCopy.payment_step_title || 'Paiement sécurisé'}</h2>
                    <p className="text-slate-500 mb-6 text-sm">
                        {widgetCopy.payment_step_subtitle || 'Finalisez votre achat avec le moyen de paiement de votre choix.'}
                    </p>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {pendingBookingId && (
                            <PaymentCountdown
                                title={widgetCopy.payment_countdown_title || 'Compte à rebours paiement'}
                                label={widgetCopy.payment_countdown_label || 'Temps restant'}
                                helperText={countdownHelperText}
                                secondsLeft={pendingSecondsLeft}
                                totalSeconds={countdownTotalSeconds}
                                expired={pendingExpired}
                            />
                        )}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                            <h3 className="text-sm font-bold text-slate-700">{widgetCopy.summary_payment_details || 'Récapitulatif'}</h3>
                            <div className="text-sm text-slate-600 flex justify-between"><span>{widgetCopy.date_label || 'Date'}</span><span>{(() => { const [y,m,d] = date.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)).toLocaleDateString(); })()}</span></div>
                            {selectedSlot && (
                                <div className="text-sm text-slate-600 flex justify-between"><span>{widgetCopy.time_label || 'Horaire'}</span><span>{selectedSlot}</span></div>
                            )}
                            <div className="text-sm text-slate-600 flex justify-between"><span>{widgetCopy.passengers || 'Passagers'}</span><span>{totalPeople}</span></div>
                            <div className="text-sm text-slate-600 flex justify-between font-semibold"><span>{widgetCopy.total || 'Total'}</span><span>{totalPrice},00 €</span></div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-slate-700">{widgetCopy.payment_title || 'Paiement'}</h4>
                                {!clientSecret && !initializingStripe && (
                                    <button
                                        type="button"
                                        className="text-xs underline"
                                        onClick={() => {
                                            setGlobalErrors([])
                                            initializeStripeIntent().catch(() => {
                                                /* handled via stripeError */
                                            })
                                        }}
                                    >
                                        {pendingExpired
                                            ? (widgetCopy.payment_restart_btn || widgetCopy.btn_pay_now || 'Relancer le paiement')
                                            : (widgetCopy.btn_pay_now || 'Payer maintenant')}
                                    </button>
                                )}
                            </div>
                            {pendingExpired ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
                                    <p>{widgetCopy.payment_countdown_expired || 'Temps écoulé. Relancez le paiement pour conserver vos places.'}</p>
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-amber-500"
                                        onClick={() => {
                                            setGlobalErrors([])
                                            initializeStripeIntent().catch(() => {
                                                /* handled via stripeError */
                                            })
                                        }}
                                    >
                                        {widgetCopy.payment_restart_btn || widgetCopy.btn_pay_now || 'Relancer le paiement'}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-xs text-slate-500">
                                        {clientSecret ? (
                                            <PaymentElementWrapper
                                                clientSecret={clientSecret}
                                                onSuccess={(intentId) => {
                                                    setGlobalErrors([])
                                                    setStripeIntentId(intentId)
                                                    setPaymentSucceeded(true)
                                                    setPaymentProvider('stripe')
                                                    funnel.paymentMethodSelected('stripe')
                                                }}
                                            />
                                        ) : (
                                            initializingStripe
                                                ? (widgetCopy.payment_initializing || 'Préparation du paiement en cours…')
                                                : (widgetCopy.init_payment_hint || 'Cliquez pour initier le paiement')
                                        )}
                                        {stripeError && <div className="text-red-600 mt-1">{stripeError}</div>}
                                    </div>

                                    <div>
                                        <PayPalButton
                                            amount={totalPrice}
                                            messages={{
                                                notConfigured: widgetCopy.payment_paypal_not_configured || 'PayPal non configuré',
                                                genericError: widgetCopy.payment_error_generic || 'Erreur de paiement',
                                                sdkLoadFailed: widgetCopy.payment_paypal_sdk_load_failed || 'Chargement PayPal impossible'
                                            }}
                                            onSuccess={async (oid) => {
                                                setGlobalErrors([])
                                                try {
                                                    setPaypalOrderId(oid)
                                                    setPaymentProvider('paypal')
                                                    funnel.paymentMethodSelected('paypal')
                                                    const bookingId = await ensurePendingBooking()
                                                    const cap = await fetch('/api/payments/paypal/capture-order', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ orderId: oid, bookingId })
                                                    })
                                                    const capData = await cap.json().catch(() => ({}))
                                                    if (!cap.ok) {
                                                        setGlobalErrors([capData?.error || (widgetCopy.payment_paypal_capture_failed || 'Capture PayPal échouée')])
                                                        return
                                                    }
                                                    setPaymentSucceeded(true)
                                                    setGlobalErrors([])
                                                } catch (error: unknown) {
                                                    const msg = error instanceof Error ? error.message : String(error)
                                                    console.error('PayPal processing error:', msg)
                                                    setGlobalErrors([widgetCopy.payment_paypal_processing_error || 'Erreur lors du traitement PayPal'])
                                                }
                                            }}
                                            onError={(msg) => {
                                                if (msg) setGlobalErrors([msg])
                                                setPaymentProvider(null)
                                            }}
                                        />
                                    </div>

                                    <div className="mt-3">
                                        <StripeWalletButton
                                            amount={totalPrice * 100}
                                            currency="eur"
                                            country="FR"
                                            label="Sweet Narcisse"
                                            ensurePendingBooking={ensurePendingBooking}
                                            onSuccess={(intentId) => {
                                                setGlobalErrors([])
                                                setStripeIntentId(intentId)
                                                setPaymentSucceeded(true)
                                                setPaymentProvider('stripe')
                                                funnel.paymentMethodSelected('stripe')
                                            }}
                                            onError={(msg) => setGlobalErrors([msg])}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-2 text-[11px] text-slate-500 leading-snug">
                                {(() => {
                                    const l = (initialLang || 'fr').toLowerCase()
                                    const link = `/${(initialLang || 'fr')}/cgv`
                                    if (l === 'en') return (<span>Cancellation: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Severe weather: full refund. <a className="underline" href={link} target="_blank" rel="noreferrer">See T&amp;Cs</a>.</span>)
                                    if (l === 'de') return (<span>Stornierung: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Unwetter: volle Erstattung. <a className="underline" href={link} target="_blank" rel="noreferrer">Siehe AGB</a>.</span>)
                                    if (l === 'es') return (<span>Cancelación: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Meteo severa: reembolso total. <a className="underline" href={link} target="_blank" rel="noreferrer">Ver Términos</a>.</span>)
                                    if (l === 'it') return (<span>Annullamento: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Meteo severa: rimborso totale. <a className="underline" href={link} target="_blank" rel="noreferrer">Vedi Termini</a>.</span>)
                                    return (<span>Annulation: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Météo sévère: remboursement intégral. <a className="underline" href={link} target="_blank" rel="noreferrer">Voir CGV</a>.</span>)
                                })()}
                            </div>

                            {paymentSucceeded ? (
                                <div className="text-xs text-green-600 mt-2">
                                    {widgetCopy.payment_ready_to_confirm || 'Paiement validé. Cliquez sur "Confirmer la réservation" pour finaliser.'}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 mt-2">
                                    {widgetCopy.payment_waiting || 'Terminez le paiement pour activer la confirmation.'}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleBookingSubmit()}
                        disabled={isSubmitting || !paymentSucceeded || pendingExpired}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg mt-4 ${paymentSucceeded && !pendingExpired ? 'bg-[#0ea5e9] text-[#0f172a] hover:bg-sky-400' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {isSubmitting
                            ? widgetCopy.submitting
                            : `${widgetCopy.confirm || 'Confirmer'} (${totalPrice}€)`}
                    </button>
                </div>
            )}

            {/* --- ÉTAPE 4 : SUCCÈS --- */}
            {(step === STEPS.SUCCESS || step === STEPS.GROUP_SUCCESS || step === STEPS.PRIVATE_SUCCESS) && (
                 <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm ${step === STEPS.SUCCESS ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {step === STEPS.SUCCESS ? '🎟️' : '📨'}
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-[#0f172a] mb-2">
                        {step === STEPS.SUCCESS ? widgetCopy.step_success : groupFormCopy.sent_title}
                    </h2>
                    <p className="text-lg text-slate-600 mb-8 max-w-md">
                        {step === STEPS.SUCCESS 
                            ? `Merci ${formData.firstName}.`
                            : groupFormCopy.sent_message
                        }
                    </p>
                    {(
                        step === STEPS.SUCCESS || step === STEPS.GROUP_SUCCESS || step === STEPS.PRIVATE_SUCCESS
                    ) && (
                        <div className="text-[11px] text-slate-500 mb-6 max-w-md">
                            {(() => {
                                const l = (initialLang || 'fr').toLowerCase()
                                const link = `/${(initialLang || 'fr')}/cgv`
                                if (l === 'en') return (<span>Cancellation: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Severe weather: full refund. <a className="underline" href={link} target="_blank" rel="noreferrer">See T&amp;Cs</a>.</span>)
                                if (l === 'de') return (<span>Stornierung: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Unwetter: volle Erstattung. <a className="underline" href={link} target="_blank" rel="noreferrer">Siehe AGB</a>.</span>)
                                if (l === 'es') return (<span>Cancelación: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Meteo severa: reembolso total. <a className="underline" href={link} target="_blank" rel="noreferrer">Ver Términos</a>.</span>)
                                if (l === 'it') return (<span>Annullamento: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Meteo severa: rimborso totale. <a className="underline" href={link} target="_blank" rel="noreferrer">Vedi Termini</a>.</span>)
                                return (<span>Annulation: &gt;48h 100%, 48–24h 50%, &lt;24h 0%. Météo sévère: remboursement intégral. <a className="underline" href={link} target="_blank" rel="noreferrer">Voir CGV</a>.</span>)
                            })()}
                        </div>
                    )}
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition">
                        {groupFormCopy.sent_button}
                    </button>
                 </div>
            )}
                {/* Modal for contact forms */}
                <ContactModal open={contactOpen} mode={contactMode} onClose={()=>setContactOpen(false)} dict={dict} lang={initialLang} />
                </div>
        </div>
    )
}