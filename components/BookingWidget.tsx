'use client'

import { useState, useRef, useEffect } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

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
  
  // Données de réservation
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [language, setLanguage] = useState<string>(initialLang.toUpperCase())
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [babies, setBabies] = useState(0)
  const [isPrivate, setIsPrivate] = useState(false) // Option barque privative
  
  // API & Slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  
  // Contact & Formulaires
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculs
  const totalPeople = adults + children + babies
  const isGroup = totalPeople > 12 // Bascule automatiquement en mode Groupe
  
  const PRICE_ADULT = 9
  const PRICE_CHILD = 4
  const PRICE_BABY = 0
  const totalPrice = (adults * PRICE_ADULT) + (children * PRICE_CHILD) + (babies * PRICE_BABY)

  // Reset des créneaux si on change les critères
  useEffect(() => {
    setSelectedSlot(null)
    setAvailableSlots([])
  }, [date, adults, children, babies])

  // --- ACTIONS DU TUNNEL ---

  // ÉTAPE 1 -> SUIVANT
  const handleSearch = async () => {
    if (totalPeople === 0) return alert("Veuillez sélectionner au moins une personne.")
    
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
        setAvailableSlots(data.availableSlots || [])
        setStep(STEPS.SLOTS)
    } catch (e) {
        console.error(e)
        alert("Erreur technique lors de la recherche.")
    } finally {
        setLoading(false)
    }
  }

  // VALIDATION STANDARD
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaToken) return alert("Veuillez cocher la case 'Je ne suis pas un robot'.")
    
    setIsSubmitting(true)
    try {
        // 👇 CORRECTION ICI : '/api/bookings' (pluriel) au lieu de '/api/booking'
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date, time: selectedSlot, 
                adults, children, babies, language, 
                userDetails: formData, 
                captchaToken
            })
        })
        
        if (res.ok) {
            setStep(STEPS.SUCCESS)
        } else {
            const err = await res.json()
            alert("Erreur: " + err.error)
            recaptchaRef.current?.reset()
        }
    } catch (e) {
        console.error(e)
        alert("Erreur de connexion (Vérifiez votre réseau ou contactez le support)")
    } finally {
        setIsSubmitting(false)
    }
  }

  // VALIDATION GROUPE
  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaToken) return alert("Veuillez cocher la case 'Je ne suis pas un robot'.")

    setIsSubmitting(true)
    try {
        const res = await fetch('/api/contact/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                people: totalPeople,
                captchaToken
            })
        })

        if (res.ok) {
            setStep(STEPS.GROUP_SUCCESS)
        } else {
            const err = await res.json()
            alert("Erreur: " + err.error)
            recaptchaRef.current?.reset()
        }
    } catch (error) {
        alert("Erreur de connexion")
    } finally {
        setIsSubmitting(false)
    }
  }

  // VALIDATION PRIVATISATION
  const handlePrivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaToken) return alert("Veuillez cocher la case 'Je ne suis pas un robot'.")

    setIsSubmitting(true)
    try {
        const res = await fetch('/api/contact/private', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                people: totalPeople,
                date: date,
                captchaToken
            })
        })

        if (res.ok) {
            setStep(STEPS.PRIVATE_SUCCESS)
        } else {
            const err = await res.json()
            alert("Erreur: " + err.error)
            recaptchaRef.current?.reset()
        }
    } catch (error) {
        alert("Erreur de connexion")
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
                        {new Date(date).toLocaleDateString(initialLang === 'fr' ? 'fr-FR' : initialLang === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
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
            
            {/* --- ÉTAPE 1 : CRITÈRES --- */}
            {step === STEPS.CRITERIA && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{dict.booking.widget.step_criteria_title}</h2>
                    <p className="text-slate-500 mb-6 text-sm">{dict.booking.subtitle}</p>
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6 flex-1">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{dict.booking.widget.date}</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#eab308] outline-none transition" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">{dict.booking.widget.passengers}</label>
                            <div className="space-y-1">
                                <Counter label={dict.booking.widget.adults} price={`${PRICE_ADULT}€`} value={adults} setter={setAdults} />
                                <Counter label={dict.booking.widget.children} price={`${PRICE_CHILD}€`} value={children} setter={setChildren} />
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
                    <p className="text-slate-500 mb-6 text-sm">{dict.booking.widget.slots_subtitle} {new Date(date).toLocaleDateString()}.</p>
                    
                    <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        {availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                                {availableSlots.map(slot => (
                                    <button key={slot} onClick={() => setSelectedSlot(slot)}
                                        className={`py-3 rounded-lg border font-bold transition-all ${selectedSlot === slot ? 'border-[#0f172a] bg-[#0f172a] text-[#eab308] shadow-md transform scale-105' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-[#eab308] hover:bg-white'}`}>
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl mb-4">📅</span>
                                <h3 className="font-bold text-slate-800">{dict.booking.widget.no_slot}</h3>
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
                            <input required type="tel" className="w-full p-3 mt-1 border rounded-lg bg-white focus:ring-2 focus:ring-[#eab308] outline-none" 
                                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
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
                        
                        <button type="submit" disabled={isSubmitting} 
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
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition">
                        {dict.group_form.sent_button}
                    </button>
                 </div>
            )}
        </div>
    </div>
  )
}