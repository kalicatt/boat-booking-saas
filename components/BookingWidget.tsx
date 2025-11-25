'use client'

import { useState, useEffect } from 'react'

interface WidgetProps {
  dict: any // Contient le dictionnaire complet (root dict)
  initialLang: string 
}

export default function BookingWidget({ dict, initialLang }: WidgetProps) {
  // --- ÉTATS ---
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [language, setLanguage] = useState<string>(initialLang.toUpperCase())
  
  // Compteurs Passagers
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [babies, setBabies] = useState(0)

  const totalPeople = adults + children + babies
  const isGroup = totalPeople > 12 // Détection Groupe (>12)

  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // États Modale & Formulaire
  const [showModal, setShowModal] = useState(false)
  const [isBooking, setIsBooking] = useState(false) 
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' })

  // État Formulaire GROUPE
  const [groupSent, setGroupSent] = useState(false)

  // --- CALCUL PRIX ---
  const PRICE_ADULT = 9
  const PRICE_CHILD = 4
  const PRICE_BABY = 0

  const totalPrice = (adults * PRICE_ADULT) + (children * PRICE_CHILD) + (babies * PRICE_BABY)

  // --- CHARGEMENT DES CRÉNEAUX ---
  useEffect(() => {
    if (isGroup) return 
    if (totalPeople === 0) return 

    async function fetchSlots() {
      setLoading(true)
      setSelectedSlot(null)
      try {
        const res = await fetch(`/api/availability?date=${date}&adults=${adults}&children=${children}&babies=${babies}&lang=${language}`)
        const data = await res.json()
        if (data.availableSlots) setAvailableSlots(data.availableSlots)
      } catch (e) { console.error(e) } 
      finally { setLoading(false) }
    }
    fetchSlots()
  }, [date, adults, children, babies, language, isGroup, totalPeople])

  // --- SOUMISSION STANDARD (Booking < 13 pers) ---
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsBooking(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, time: selectedSlot, 
          adults, children, babies, 
          people: totalPeople,
          language, userDetails: formData
        })
      })
      if (res.ok) setBookingSuccess(true)
      else {
        const err = await res.json()
        alert("Erreur : " + err.error)
      }
    } catch (e) { alert("Erreur connexion") } 
    finally { setIsBooking(false) }
  }

  // --- SOUMISSION GROUPE (>12 pers) ---
  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsBooking(true)

    const target = e.target as typeof e.target & {
        firstName: { value: string }; lastName: { value: string };
        email: { value: string }; phone: { value: string };
        message: { value: string };
    };

    const groupData = {
        firstName: target.firstName.value, lastName: target.lastName.value,
        email: target.email.value, phone: target.phone.value,
        message: target.message.value,
        people: totalPeople
    }

    try {
        const res = await fetch('/api/contact/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groupData)
        })

        if (res.ok) { setGroupSent(true) }
        else { alert("Erreur lors de l'envoi de la demande de groupe.") }
    } catch (error) {
        alert("Erreur de connexion")
    } finally {
        setIsBooking(false)
    }
  }

  // --- COMPOSANT COMPTEUR ---
  // On passe maintenant les labels et le prix "Gratuit" via les props de traduction
  const Counter = ({ label, value, setter, price }: any) => (
    <div className="flex justify-between items-center mb-2">
      <div>
        <span className="block text-xs font-bold text-slate-400 uppercase">{label}</span>
        <span className="text-[10px] text-slate-500">{price}</span>
      </div>
      <div className="flex items-center bg-slate-800 rounded-lg">
        <button type="button" onClick={() => setter(Math.max(0, value - 1))} className="px-3 py-1 text-white hover:bg-slate-700 rounded-l-lg transition">-</button>
        <span className="px-2 text-sm font-bold text-white min-w-[20px] text-center">{value}</span>
        <button type="button" onClick={() => setter(value + 1)} className="px-3 py-1 text-white hover:bg-slate-700 rounded-r-lg transition">+</button>
      </div>
    </div>
  )

  // Construction du titre du groupe dynamiquement
  const groupTitle = dict.group_form?.title?.replace('{people}', totalPeople.toString()) || 'Demande de Groupe'


  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-w-5xl mx-auto border border-slate-100 text-left">
        
        {/* COLONNE GAUCHE (Critères) */}
        <div className="bg-[#0f172a] p-8 text-white md:w-1/3 flex flex-col justify-center">
          
          {/* ACCÈS AU TITRE PRINCIPAL */}
          <h3 className="text-2xl font-serif mb-2 text-[#eab308]">{dict.booking?.title || 'Réserver'}</h3>
          
          <div className="space-y-6">
            
            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-slate-400 tracking-wider">{dict.booking.widget.date}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-[#eab308] outline-none" />
            </div>

            {/* Compteurs Passagers */}
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                {/* CORRECTION: Utilisation des clés de traduction pour les libellés des passagers */}
                <Counter 
                    label={dict.booking.widget.adults} 
                    price={`${PRICE_ADULT},00 €`} 
                    value={adults} 
                    setter={setAdults} 
                />
                <Counter 
                    label={dict.booking.widget.children} 
                    price={`${PRICE_CHILD},00 €`} 
                    value={children} 
                    setter={setChildren} 
                />
                <Counter 
                    label={dict.booking.widget.babies} 
                    price={dict.booking.widget.free} // Clé de traduction pour le texte "Gratuit (0,00 €)"
                    value={babies} 
                    setter={setBabies} 
                />
                
                <div className="border-t border-slate-700 mt-4 pt-3 flex justify-between items-center">
                    <span className="text-xs font-bold text-[#eab308] uppercase">{dict.booking.widget.passengers} ({totalPeople} pers.)</span>
                    <span className="text-xl font-bold">{totalPrice},00 €</span>
                </div>
            </div>

            {/* Langue */}
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-slate-400 tracking-wider">{dict.booking.widget.language}</label>
              <div className="flex gap-2">
                {['FR', 'EN', 'DE'].map((lang) => (
                  <button type="button" key={lang} onClick={() => setLanguage(lang)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${language === lang ? 'bg-[#eab308] text-black border-[#eab308]' : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-400'}`}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (Contenu dynamique) */}
        <div className="p-8 md:w-2/3 bg-white flex flex-col relative">
          
          {/* CAS 1 : C'est un GROUPE (>12) */}
          {isGroup ? (
             <div className="h-full flex flex-col justify-center animate-in fade-in">
                {!groupSent ? (
                    <>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                            <h3 className="text-blue-800 font-bold text-lg">{groupTitle}</h3> 
                            <p className="text-blue-600 text-sm mt-1">
                                {dict.group_form.subtitle}
                            </p>
                        </div>
                        <form onSubmit={handleGroupSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input required name="firstName" placeholder={dict.group_form.placeholder_firstname} className="border p-3 rounded bg-slate-50" />
                                <input required name="lastName" placeholder={dict.group_form.placeholder_lastname} className="border p-3 rounded bg-slate-50" />
                            </div>
                            <input required name="email" type="email" placeholder={dict.group_form.placeholder_email} className="w-full border p-3 rounded bg-slate-50" />
                            <input required name="phone" type="tel" placeholder={dict.group_form.placeholder_phone} className="w-full border p-3 rounded bg-slate-50" />
                            <textarea name="message" placeholder={dict.group_form.placeholder_message} className="w-full border p-3 rounded bg-slate-50 h-24" />
                            <button disabled={isBooking} className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition">
                                {isBooking ? "Envoi..." : dict.group_form.button_send}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-4">✅</div>
                        <h3 className="text-2xl font-bold text-slate-800">{dict.group_form.sent_title}</h3>
                        <p className="text-slate-500 mt-2">{dict.group_form.sent_message}</p>
                        <button type="button" onClick={() => setGroupSent(false)} className="mt-6 text-blue-600 underline">{dict.group_form.sent_button}</button>
                    </div>
                )}
             </div>
          ) : (
            /* CAS 2 : Réservation Classique (Calendrier) */
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                📅 {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              
              <div className="flex-1">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-[#eab308] rounded-full animate-spin"></div>
                        <span className="text-sm">Recherche...</span>
                    </div>
                ) : totalPeople === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-orange-50 text-orange-800 rounded-lg border border-orange-100 p-6 text-center">
                        <span className="text-2xl mb-2">💡</span>
                        <p className="font-bold text-sm">Veuillez sélectionner au moins un passager pour voir les disponibilités.</p>
                    </div>
                ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar content-start">
                      {availableSlots.map((time) => (
                        <button type="button" key={time} onClick={() => setSelectedSlot(time)}
                          className={`py-2 px-1 rounded border text-sm font-semibold transition-all ${selectedSlot === time ? 'bg-[#0f172a] text-[#eab308] border-[#0f172a] shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-[#eab308] hover:text-[#eab308]'}`}>
                          {time}
                        </button>
                      ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-orange-50 text-orange-800 rounded-lg border border-orange-100 p-6 text-center">
                        <span className="text-2xl mb-2">😔</span>
                        <p className="font-bold text-sm">{dict.booking.widget.no_slot}</p>
                    </div>
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button type="button" onClick={() => setShowModal(true)} disabled={!selectedSlot}
                  className={`px-8 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:-translate-y-1 ${selectedSlot ? 'bg-[#eab308] text-black hover:bg-yellow-400 cursor-pointer' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                  {selectedSlot ? `${dict.booking.widget.reserve} ${selectedSlot}` : dict.booking.widget.choose}
                </button>
              </div>
            </>
          )}
        </div>

        {/* --- MODALE RÉSERVATION CLASSIQUE --- */}
        {showModal && !isGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-8 relative animate-in fade-in zoom-in duration-300">
               {!bookingSuccess ? (
                <>
                  <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-300 hover:text-black text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition">✕</button>
                  <h3 className="text-2xl font-serif font-bold text-[#0f172a] mb-1">{dict.booking.widget.form_title}</h3>
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-100 mb-4 text-sm text-yellow-800">
                    <p><strong>Total : {totalPrice},00 €</strong> ({adults} Ad, {children} Enf, {babies} Bébé)</p>
                  </div>
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input required placeholder="Prénom" className="w-full border p-2.5 rounded bg-slate-50" onChange={e => setFormData({...formData, firstName: e.target.value})} />
                        <input required placeholder="Nom" className="w-full border p-2.5 rounded bg-slate-50" onChange={e => setFormData({...formData, lastName: e.target.value})} />
                    </div>
                    <input required type="email" placeholder="Email" className="w-full border p-2.5 rounded bg-slate-50" onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input required type="tel" placeholder="Téléphone" className="w-full border p-2.5 rounded bg-slate-50" onChange={e => setFormData({...formData, phone: e.target.value})} />
                    <button type="submit" disabled={isBooking} className="w-full bg-[#0f172a] text-[#eab308] py-4 rounded-lg font-bold mt-2 hover:bg-black transition">
                      {isBooking ? "Traitement..." : dict.booking.widget.confirm}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🎉</div>
                  <h3 className="text-2xl font-serif font-bold text-[#0f172a] mb-2">C'est réservé !</h3>
                  <p className="text-slate-500 mb-8">Merci {formData.firstName}. Un email de confirmation a été envoyé.</p>
                  <button type="button" onClick={() => { setShowModal(false); setBookingSuccess(false); setSelectedSlot(null); }} className="text-sm font-bold underline text-slate-400 hover:text-black transition">Fermer</button>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  )
}