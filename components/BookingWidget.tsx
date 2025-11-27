'use client'

import { useState, useRef, useEffect } from 'react'
import { PHONE_CODES } from '@/lib/phoneData'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { localToE164, isPossibleLocalDigits, isValidE164, formatInternational } from '@/lib/phone'
import { PRICES, GROUP_THRESHOLD } from '@/lib/config'
import ReCAPTCHA from 'react-google-recaptcha'
import PaymentElementWrapper from '@/components/PaymentElementWrapper'
import StripeWalletButton from '@/components/StripeWalletButton'
import PayPalButton from '@/components/PayPalButton'

interface WizardProps {
  dict: any
  initialLang: string
}

// Les étapes du tunnel
const STEPS = {
  CRITERIA: 1,      // Choix date & personnes
  SLOTS: 2,         // Choix horaire
  CONTACT: 3,       // Formulaire final
  SUCCESS: 4,       // Confirmation
  GROUP_CONTACT: 5, // Formulaire spécial groupe (>12)
  GROUP_SUCCESS: 6, // Confirmation groupe
  PRIVATE_CONTACT: 7, // Formulaire spécial privatisation
  PRIVATE_SUCCESS: 8  // Confirmation privatisation
}

export default function BookingWizard({ dict, initialLang }: WizardProps) {
  // --- ÉTATS ---
  const [step, setStep] = useState(STEPS.CRITERIA)
    const [globalErrors, setGlobalErrors] = useState<string[]>([])
  
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
  const [isPrivate, setIsPrivate] = useState(false) // Option barque privative
  
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

    const buildE164 = () => localToE164(phoneCode, formData.phone)
    const getFormattedPhone = () => formatInternational(buildE164())
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [stripeError, setStripeError] = useState<string | null>(null)
    const [paymentSucceeded, setPaymentSucceeded] = useState<boolean>(false)
        const [paymentProvider, setPaymentProvider] = useState<null | 'stripe' | 'paypal'>(null)
    const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null)
        const [stripeIntentId, setStripeIntentId] = useState<string | null>(null)
        const [pendingBookingId, setPendingBookingId] = useState<string | null>(null)

  // Calculs
  const totalPeople = adults + children + babies
    const isGroup = totalPeople > GROUP_THRESHOLD // Bascule automatiquement en mode Groupe
    const totalPrice = (adults * PRICES.ADULT) + (children * PRICES.CHILD) + (babies * PRICES.BABY)

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
            } catch (e) {
                // Silent failure
            }
        }
        detect()
        return () => { aborted = true }
    }, [])

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
                    // Petit tampon de 5 minutes pour éviter les "bords"
                    filtered = slots.filter((s) => {
                        const [h, m] = s.split(':').map(Number)
                        const mins = (h * 60) + m
                        return mins > nowMinutes + 5
                    })
                }

                setAvailableSlots(filtered)
                setStep(STEPS.SLOTS)
    } catch (e) {
        console.error(e)
        setGlobalErrors(["Erreur technique lors de la recherche. Veuillez réessayer."])
    } finally {
        setLoading(false)
    }
  }

  // VALIDATION STANDARD
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
                if (!captchaToken) { setGlobalErrors(["Veuillez cocher la case 'Je ne suis pas un robot'."]); return }
                if (!paymentSucceeded) { setGlobalErrors(["Veuillez finaliser le paiement avant confirmation."]); return }
    
    setIsSubmitting(true)
    try {
        // If Stripe flow with pending booking, verify and finish
        if (paymentProvider === 'stripe' && stripeIntentId && pendingBookingId) {
            try {
                const verifyRes = await fetch('/api/payments/verify-stripe-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intentId: stripeIntentId }) })
                const verify = await verifyRes.json()
                if (!verifyRes.ok || verify.status !== 'succeeded') {
                    const msg = (dict.booking.widget.payment_stripe_not_confirmed || 'Paiement Stripe non confirmé. Statut: {status}').replace('{status}', String(verify?.status || 'inconnu'))
                    setGlobalErrors([msg])
                    setIsSubmitting(false)
                    return
                }
            } catch {
                setGlobalErrors([dict.booking.widget.payment_stripe_verify_failed || 'Impossible de vérifier le paiement Stripe.'])
                setIsSubmitting(false)
                return
            }
            setGlobalErrors([])
            setStep(STEPS.SUCCESS)
            return
        }

        // If PayPal flow with pending booking already captured, just finish
        if (paymentProvider === 'paypal' && pendingBookingId && paymentSucceeded) {
            setGlobalErrors([])
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
                            const errCap = await cap.json().catch(()=>({error:(dict.booking.widget.payment_paypal_capture_failed || 'Capture PayPal échouée')}))
                            setGlobalErrors([(dict.booking.widget.payment_paypal_capture_failed || 'Capture PayPal échouée')])
                        setIsSubmitting(false)
                        return
                    }
                } catch (e) {
                    setGlobalErrors(["Erreur réseau lors de l'association PayPal."])
                    setIsSubmitting(false)
                    return
                }
            }
            setGlobalErrors([])
            setStep(STEPS.SUCCESS)
        } else {
            const err = await res.json().catch(()=>({error:'Erreur inconnue'}))
            setGlobalErrors(["Erreur: " + err.error])
            recaptchaRef.current?.reset()
        }
    } catch (e) {
        console.error(e)
        setGlobalErrors(["Erreur de connexion (vérifiez votre réseau ou contactez le support)"])
    } finally {
        setIsSubmitting(false)
    }
  }

    // Helper to ensure a pending booking exists (used by Stripe wallets)
    const ensurePendingBooking = async (): Promise<string> => {
        let bId = pendingBookingId
        if (bId) return bId
        const resPending = await fetch('/api/bookings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        const dataPending = await resPending.json()
        if (!resPending.ok) {
            const msg = dataPending?.error || (dict.booking.widget.booking_create_failed || 'Impossible de créer la réservation')
            setGlobalErrors([msg])
            throw new Error(msg)
        }
        const newId: string | null = dataPending.bookingId || null
        if (!newId) {
            const nf = dict.booking.widget.booking_not_found || 'Réservation introuvable'
            setGlobalErrors([nf])
            throw new Error(nf)
        }
        setPendingBookingId(newId)
        return newId
    }

  // VALIDATION GROUPE
  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
        if (!captchaToken) { setGlobalErrors(["Veuillez cocher la case 'Je ne suis pas un robot'."]); return }

    setIsSubmitting(true)
    try {
        const res = await fetch('/api/contact/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                phone: buildE164(),
                people: totalPeople,
                captchaToken
            })
        })

        if (res.ok) {
            setGlobalErrors([])
            setStep(STEPS.GROUP_SUCCESS)
        } else {
            const err = await res.json().catch(()=>({error:'Erreur inconnue'}))
            setGlobalErrors(["Erreur: " + err.error])
            recaptchaRef.current?.reset()
        }
    } catch (error) {
        setGlobalErrors(["Erreur de connexion"])
    } finally {
        setIsSubmitting(false)
    }
  }

  // VALIDATION PRIVATISATION
  const handlePrivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
        if (!captchaToken) { setGlobalErrors(["Veuillez cocher la case 'Je ne suis pas un robot'."]); return }

    setIsSubmitting(true)
    try {
        const res = await fetch('/api/contact/private', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                phone: buildE164(),
                people: totalPeople,
                date,
                captchaToken
            })
        })

        if (res.ok) {
            setGlobalErrors([])
            setStep(STEPS.PRIVATE_SUCCESS)
        } else {
            const err = await res.json().catch(()=>({error:'Erreur inconnue'}))
            setGlobalErrors(["Erreur: " + err.error])
            recaptchaRef.current?.reset()
        }
    } catch (error) {
        setGlobalErrors(["Erreur de connexion"])
    } finally {
        setIsSubmitting(false)
    }
  }

  // Composant Compteur
  const Counter = ({ label, value, setter, price }: any) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <div>
        <span className="block text-sm font-bold text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{price}</span>
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
    if (isGroup) return dict.group_form?.title?.replace('{people}', totalPeople)
    if (isPrivate) return dict.private_form?.title
    return dict.booking?.widget?.summary_title_standard || dict.booking?.title
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-100">
        
        {/* === COLONNE GAUCHE : RÉCAPITULATIF === */}
        <div className="bg-[#0f172a] p-8 text-white md:w-1/3 flex flex-col relative transition-all duration-500">
            <h3 className="text-2xl font-serif text-[#eab308] mb-6">
                {getMainTitle()}
            </h3>
            
            {/* Barre de progression */}
            <div className="flex space-x-2 mb-8">
                <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-[#eab308]' : 'bg-slate-700'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-[#eab308]' : 'bg-slate-700'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-[#eab308]' : 'bg-slate-700'}`} />
            </div>

            <div className="space-y-4 flex-1">
                {/* BLOC 1 : DATE & PAX */}
                <div className={`p-4 rounded-xl border transition-all ${step === STEPS.CRITERIA ? 'border-[#eab308] bg-slate-800 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-slate-700 bg-transparent'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs uppercase font-bold text-slate-400">{dict.booking.widget.summary_details}</span>
                        {step > STEPS.CRITERIA && <button onClick={() => setStep(STEPS.CRITERIA)} className="text-[10px] text-[#eab308] underline hover:text-white">{dict.booking.widget.modify_btn}</button>}
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
                        <div className="text-[#eab308] font-bold text-xl mt-2">{totalPrice},00 €</div>
                    ) : (
                        <div className="mt-2 inline-block px-2 py-1 rounded bg-blue-900/50 text-blue-200 text-xs font-bold border border-blue-500/30">
                            {isPrivate ? "✨ " + dict.booking.widget.private_badge : "👥 " + dict.booking.widget.group_badge}
                        </div>
                    )}
                </div>

                {/* BLOC 2 : HORAIRE */}
                {selectedSlot && !isGroup && !isPrivate && (
                    <div className={`p-4 rounded-xl border transition-all animate-in fade-in slide-in-from-left-4 ${step === STEPS.SLOTS ? 'border-[#eab308] bg-slate-800' : 'border-slate-700'}`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs uppercase font-bold text-slate-400">{dict.booking.widget.summary_departure}</span>
                            {step > STEPS.SLOTS && step < STEPS.SUCCESS && <button onClick={() => setStep(STEPS.SLOTS)} className="text-[10px] text-[#eab308] underline hover:text-white">{dict.booking.widget.modify_btn}</button>}
                        </div>
                        <div className="font-bold text-2xl text-[#eab308]">{selectedSlot}</div>
                        <div className="text-xs text-slate-400 mt-1">{dict.booking.widget.duration_text}</div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-xs text-slate-500 border-t border-slate-800 pt-4">
                <p>{dict.booking.widget.help_text}</p>
                <p className="text-slate-400 mt-1">📞 +33 3 89 20 68 92</p>
            </div>
        </div>

        {/* === COLONNE DROITE === */}
        <div className="p-8 md:w-2/3 bg-slate-50 relative flex flex-col">
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
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{dict.booking.widget.step_criteria_title}</h2>
                    <p className="text-slate-500 mb-6 text-sm">{dict.booking.subtitle}</p>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 flex-1">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{dict.booking.widget.date}</label>
                            <input
                                type="date"
                                value={date}
                                min={todayLocalISO}
                                onChange={(e) => {
                                  const v = e.target.value
                                  // Bloque les dates passées côté client
                                  if (v && v < todayLocalISO) setDate(todayLocalISO)
                                  else setDate(v)
                                }}
                                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#eab308] outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{dict.booking.widget.passengers}</label>
                            <div className="space-y-1">
                                <Counter label={dict.booking.widget.adults} price={`${PRICES.ADULT}€`} value={adults} setter={setAdults} />
                                <Counter label={dict.booking.widget.children} price={`${PRICES.CHILD}€`} value={children} setter={setChildren} />
                                <Counter label={dict.booking.widget.babies} price={dict.booking.widget.free} value={babies} setter={setBabies} />
                            </div>
                        </div>

                        {!isGroup && (
                            <div className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${isPrivate ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                                 onClick={() => setIsPrivate(!isPrivate)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isPrivate ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                    {isPrivate && <span className="text-white text-xs">✓</span>}
                                </div>
                                <div>
                                    <span className={`block text-sm font-bold ${isPrivate ? 'text-blue-800' : 'text-slate-600'}`}>✨ {dict.booking.widget.private_toggle_title}</span>
                                    <span className="text-xs text-slate-500">{dict.booking.widget.private_toggle_subtitle}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{dict.booking.widget.language}</label>
                            <div className="flex gap-2">
                                {['FR', 'EN', 'DE'].map(lang => (
                                    <button key={lang} onClick={() => setLanguage(lang)}
                                        className={`flex-1 py-2 rounded-lg font-bold border transition-all text-sm ${language === lang ? 'border-[#eab308] bg-yellow-50 text-black shadow-sm' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'}`}>
                                        {lang === 'FR' ? '🇫🇷' : lang === 'EN' ? '🇬🇧' : '🇩🇪'} {lang}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button onClick={handleSearch} disabled={loading} 
                            className="w-full bg-[#0f172a] text-[#eab308] py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2">
                            {loading ? <span className="animate-spin">⏳</span> : null}
                            {loading ? dict.booking.widget.loading : isGroup ? dict.booking.widget.btn_continue_group : isPrivate ? dict.booking.widget.btn_continue_private : dict.booking.widget.btn_search}
                        </button>
                    </div>
                </div>
            )}

            {/* --- ÉTAPE 2 : HORAIRES --- */}
            {step === STEPS.SLOTS && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setStep(STEPS.CRITERIA)} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 w-fit">← {dict.booking.widget.back_btn || "Retour"}</button>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{dict.booking.widget.step_slots_title}</h2>
                    <p className="text-slate-500 mb-6 text-sm">{dict.booking.widget.slots_subtitle} {(() => { const [y,m,d] = date.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)).toLocaleDateString(); })()}.</p>
                    
                    <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        {availableSlots.length > 0 ? (
                            <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                                {availableSlots.map(slot => (
                                    <button key={slot} onClick={() => setSelectedSlot(slot)}
                                        className={`py-3 rounded-lg border font-bold transition-all ${selectedSlot === slot ? 'border-[#0f172a] bg-[#0f172a] text-[#eab308] shadow-md transform scale-105' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-[#eab308] hover:bg-white'}`}>
                                        {slot}
                                    </button>
                                ))}
                            </div>
                                {/* --- CTA: Contact forms shortcut (always visible) --- */}
                                <div className="mt-8 bg-white p-4 border rounded shadow-sm">
                                    <div className="text-sm text-slate-700 font-bold mb-2">Besoin d'un devis groupe ou d'une privatisation ?</div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            type="button"
                                            className="px-3 py-2 text-sm rounded border border-slate-200 hover:bg-slate-50"
                                            onClick={() => {
                                                // If we have meaningful context, navigate with query+hash; else smooth scroll
                                                const hasContext = totalPeople > 0 || !!date
                                                if (hasContext) {
                                                    try {
                                                        const params = new URLSearchParams()
                                                        params.set('people', String(Math.max(totalPeople, GROUP_THRESHOLD + 1)))
                                                        if (date) params.set('date', date)
                                                        const url = `${window.location.pathname}?${params.toString()}#contact-group`
                                                        window.location.assign(url)
                                                        return
                                                    } catch {
                                                        // fallthrough to smooth scroll
                                                    }
                                                }
                                                const el = document.getElementById('contact-group') || document.getElementById('contact')
                                                if (el) {
                                                    history.pushState(null, '', '#contact-group')
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                } else {
                                                    setAdults(GROUP_THRESHOLD + 1); setStep(STEPS.GROUP_CONTACT)
                                                }
                                            }}
                                        >
                                            👥 Demande groupe
                                        </button>
                                        <button
                                            type="button"
                                            className="px-3 py-2 text-sm rounded border border-slate-200 hover:bg-slate-50"
                                            onClick={() => {
                                                const hasContext = totalPeople > 0 || !!date
                                                if (hasContext) {
                                                    try {
                                                        const params = new URLSearchParams()
                                                        if (totalPeople > 0) params.set('people', String(totalPeople))
                                                        if (date) params.set('date', date)
                                                        const url = `${window.location.pathname}?${params.toString()}#contact-private`
                                                        window.location.assign(url)
                                                        return
                                                    } catch {
                                                        // fallthrough to smooth scroll
                                                    }
                                                }
                                                const el = document.getElementById('contact-private') || document.getElementById('contact')
                                                if (el) {
                                                    history.pushState(null, '', '#contact-private')
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                                } else {
                                                    setIsPrivate(true); setStep(STEPS.PRIVATE_CONTACT)
                                                }
                                            }}
                                        >
                                            ✨ Demande de privatisation
                                        </button>
                                    </div>
                                </div>
                            </>

                                                ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl mb-3">📅</span>
                                <h3 className="font-bold text-slate-800">
                                  {date === todayLocalISO ? 'Plus de départs aujourd\'hui' : (dict.booking.widget.no_slot || 'Aucun créneau disponible')}
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
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${selectedSlot ? 'bg-[#eab308] text-black hover:bg-yellow-400' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                            {dict.booking.widget.btn_validate_slot} →
                        </button>
                    </div>
                </div>
            )}

            {/* --- ÉTAPE 3 / CONTACT --- */}
            {(step === STEPS.CONTACT || step === STEPS.GROUP_CONTACT || step === STEPS.PRIVATE_CONTACT) && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setStep(step === STEPS.CONTACT ? STEPS.SLOTS : STEPS.CRITERIA)} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 w-fit">← {dict.booking.widget.back_btn || "Retour"}</button>
                    
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                        {step === STEPS.PRIVATE_CONTACT ? dict.private_form.title : dict.booking.widget.form_title}
                    </h2>
                    <p className="text-slate-500 mb-6 text-sm">
                        {step === STEPS.PRIVATE_CONTACT 
                            ? dict.private_form.subtitle 
                            : dict.booking.widget.form_subtitle || "Complete your details"}
                    </p>
                    
                    <form 
                        onSubmit={
                            step === STEPS.GROUP_CONTACT ? handleGroupSubmit : 
                            step === STEPS.PRIVATE_CONTACT ? handlePrivateSubmit : 
                            handleBookingSubmit
                        } 
                        className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">{dict.group_form.placeholder_firstname}</label>
                                <input required className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#eab308] outline-none" 
                                    value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">{dict.group_form.placeholder_lastname}</label>
                                <input required className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#eab308] outline-none" 
                                    value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500">{dict.group_form.placeholder_email}</label>
                            <input required type="email" className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#eab308] outline-none" 
                                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        
                                                <div>
                                                        <label className="text-xs font-bold uppercase text-slate-500">{dict.group_form.placeholder_phone}</label>
                                                        <div className="flex gap-2 mt-1 items-start">
                                                            <div className="flex flex-col w-40">
                                                                <input
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
                                                                    className={`p-3 border rounded-lg bg-white focus:ring-2 outline-none text-sm ${phoneCodeError ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-[#eab308]'}`}
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
                                                                    className={`w-full p-3 border rounded-lg bg-white focus:ring-2 outline-none ${phoneError ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-[#eab308]'}`}
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
                                <label className="text-xs font-bold uppercase text-slate-500">{dict.private_form.message_label || "Message"}</label>
                                <textarea className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#eab308] outline-none h-20" 
                                    placeholder={step === STEPS.PRIVATE_CONTACT ? dict.private_form.placeholder_message : dict.group_form.placeholder_message}
                                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                            </div>
                        )}

                        <div className="bg-slate-100 p-4 rounded-xl flex justify-center">
                             <ReCAPTCHA
                                ref={recaptchaRef}
                                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                                onChange={(token) => setCaptchaToken(token)}
                            />
                        </div>

                                                {/* Paiement (Stripe Payment Element placeholder) */}
                                                {step === STEPS.CONTACT && (
                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-sm font-bold text-slate-700">{dict.booking.widget.payment_title || 'Paiement'}</h4>
                                                            <button type="button" className="text-xs underline" onClick={async()=>{
                                                                setStripeError(null)
                                                                try {
                                                                    let bId = pendingBookingId
                                                                    if (!bId) {
                                                                        const resPending = await fetch('/api/bookings', {
                                                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
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
                                                                        const dataPending = await resPending.json()
                                                                        if (!resPending.ok) { setStripeError(dataPending.error || (dict.booking.widget.booking_create_failed || 'Impossible de créer la réservation')); return }
                                                                        bId = dataPending.bookingId
                                                                        setPendingBookingId(bId)
                                                                    }
                                                                    if (!bId) { setStripeError(dict.booking.widget.booking_not_found || 'Réservation introuvable'); return }
                                                                    const res = await fetch('/api/payments/create-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: bId }) })
                                                                    const data = await res.json()
                                                                    if (res.ok && data.clientSecret) {
                                                                        setClientSecret(data.clientSecret)
                                                                        setPaymentProvider('stripe')
                                                                    } else {
                                                                        setStripeError(data.error || (dict.booking.widget.payment_error_generic || 'Erreur paiement'))
                                                                    }
                                                                } catch { setStripeError(dict.booking.widget.payment_error_network || 'Erreur de connexion paiement') }
                                                            }}>{dict.booking.widget.btn_pay_now || 'Payer maintenant'}</button>
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {clientSecret ? (
                                                                <PaymentElementWrapper clientSecret={clientSecret} onSuccess={(intentId)=>{
                                                                    setGlobalErrors([])
                                                                    setStripeIntentId(intentId)
                                                                    setPaymentSucceeded(true)
                                                                    setPaymentProvider('stripe')
                                                                }} />
                                                            ) : (
                                                                (dict.booking.widget.init_payment_hint || 'Cliquez pour initier le paiement')
                                                            )}
                                                            {stripeError && <div className="text-red-600 mt-1">{stripeError}</div>}
                                                        </div>

                                                        {/* Alternative: PayPal */}
                                                        <div>
                                                            <PayPalButton
                                                                amount={totalPrice}
                                                                messages={{
                                                                    notConfigured: dict.booking.widget.payment_paypal_not_configured || 'PayPal not configured',
                                                                    genericError: dict.booking.widget.payment_error_generic || 'Payment error',
                                                                    sdkLoadFailed: dict.booking.widget.payment_paypal_sdk_load_failed || 'Failed to load PayPal SDK'
                                                                }}
                                                                onSuccess={async (oid)=>{
                                                                    try {
                                                                        setPaypalOrderId(oid)
                                                                        setPaymentProvider('paypal')
                                                                        // Ensure pending booking exists
                                                                        let bId = pendingBookingId
                                                                        if (!bId) {
                                                                            const resPending = await fetch('/api/bookings', {
                                                                                method: 'POST', headers: { 'Content-Type': 'application/json' },
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
                                                                            const dataPending = await resPending.json()
                                                                            if (!resPending.ok) { setGlobalErrors([dataPending.error || (dict.booking.widget.booking_create_failed || 'Impossible de créer la réservation')]); return }
                                                                            bId = dataPending.bookingId
                                                                            setPendingBookingId(bId)
                                                                        }
                                                                        if (!bId) { setGlobalErrors([dict.booking.widget.booking_not_found || 'Réservation introuvable']); return }
                                                                        // Capture and link payment
                                                                        const cap = await fetch('/api/payments/paypal/capture-order', {
                                                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ orderId: oid, bookingId: bId })
                                                                        })
                                                                        const capData = await cap.json().catch(()=>({}))
                                                                        if (!cap.ok) { setGlobalErrors([capData?.error || (dict.booking.widget.payment_paypal_capture_failed || 'Capture PayPal échouée')]); return }
                                                                        setPaymentSucceeded(true)
                                                                        setGlobalErrors([])
                                                                        setStep(STEPS.SUCCESS)
                                                                    } catch (e) {
                                                                        setGlobalErrors([dict.booking.widget.payment_paypal_processing_error || 'Erreur lors du traitement PayPal'])
                                                                    }
                                                                }}
                                                                onError={(msg)=> setGlobalErrors([msg]) }
                                                            />
                                                        </div>

                                                        {/* Apple Pay / Google Pay via Stripe Payment Request */}
                                                        <div className="mt-3">
                                                            <StripeWalletButton
                                                                amount={totalPrice * 100}
                                                                currency="eur"
                                                                country="FR"
                                                                label="Sweet Narcisse"
                                                                ensurePendingBooking={ensurePendingBooking}
                                                                onSuccess={(intentId)=>{
                                                                    setGlobalErrors([])
                                                                    setStripeIntentId(intentId)
                                                                    setPaymentSucceeded(true)
                                                                    setPaymentProvider('stripe')
                                                                }}
                                                                onError={(msg)=> setGlobalErrors([msg])}
                                                            />
                                                        </div>

                                                        {/* Cancellation summary */}
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
                                                    </div>
                                                )}
                        
                        <button type="submit" disabled={isSubmitting || !!phoneError || !!phoneCodeError} 
                            className="w-full bg-[#0f172a] text-[#eab308] py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg mt-4">
                            {isSubmitting ? dict.booking.widget.submitting : 
                                step === STEPS.CONTACT ? `${dict.booking.widget.confirm} (${totalPrice}€)` : 
                                step === STEPS.PRIVATE_CONTACT ? dict.private_form.button_send :
                                dict.group_form.button_send}
                        </button>
                    </form>
                </div>
            )}

            {/* --- ÉTAPE 4 : SUCCÈS --- */}
            {(step === STEPS.SUCCESS || step === STEPS.GROUP_SUCCESS || step === STEPS.PRIVATE_SUCCESS) && (
                 <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm ${step === STEPS.SUCCESS ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {step === STEPS.SUCCESS ? '🎟️' : '📨'}
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-[#0f172a] mb-2">
                        {step === STEPS.SUCCESS ? dict.booking.widget.step_success : dict.group_form.sent_title}
                    </h2>
                    <p className="text-lg text-slate-600 mb-8 max-w-md">
                        {step === STEPS.SUCCESS 
                            ? `Merci ${formData.firstName}.`
                            : dict.group_form.sent_message
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
                        {dict.group_form.sent_button}
                    </button>
                 </div>
            )}
        </div>
    </div>
  )
}