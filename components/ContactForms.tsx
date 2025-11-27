"use client"
import { useEffect, useRef, useState } from 'react'
import { submitGroupRequest, submitPrivateRequest, type Lang } from '@/lib/contactClient'

declare global { interface Window { grecaptcha?: any } }

function tDict(dict: any, lang: Lang) {
  // Prefer dictionary keys; fallback to internal phrases when missing
  const group = dict.group_form || {}
  const priv = dict.private_form || {}
  const nav = dict.nav || {}
  const fallback = (map: Record<Lang, string>) => map[lang]
  return {
    heading: nav.contact || fallback({ fr: 'CONTACT', en: 'CONTACT', de: 'KONTAKT', es: 'CONTACTO', it: 'CONTATTO' }),
    groupTab: group.title || fallback({ fr: 'Demande Groupe', en: 'Group Request', de: 'Gruppenanfrage', es: 'Solicitud de Grupo', it: 'Richiesta Gruppo' }),
    privateTab: priv.title || fallback({ fr: 'Privatisation', en: 'Private Booking', de: 'Privatbuchung', es: 'Privatización', it: 'Privatizzazione' }),
    firstName: group.placeholder_firstname || fallback({ fr: 'Prénom', en: 'First name', de: 'Vorname', es: 'Nombre', it: 'Nome' }),
    lastName: group.placeholder_lastname || fallback({ fr: 'Nom', en: 'Last name', de: 'Nachname', es: 'Apellido', it: 'Cognome' }),
    email: group.placeholder_email || fallback({ fr: 'Email', en: 'Email', de: 'E‑Mail', es: 'Email', it: 'Email' }),
    phone: group.placeholder_phone || fallback({ fr: 'Téléphone', en: 'Phone', de: 'Telefon', es: 'Teléfono', it: 'Telefono' }),
    people: fallback({ fr: 'Nombre de personnes', en: 'People', de: 'Personen', es: 'Personas', it: 'Persone' }),
    date: fallback({ fr: 'Date souhaitée', en: 'Requested date', de: 'Wunschtermin', es: 'Fecha solicitada', it: 'Data richiesta' }),
    messageLabel: priv.message_label || fallback({ fr: 'Message / Souhaits particuliers', en: 'Message / Special Wishes', de: 'Nachricht / Sonderwünsche', es: 'Mensaje / Peticiones especiales', it: 'Messaggio / Richieste speciali' }),
    messagePlaceholder: priv.placeholder_message || group.placeholder_message || fallback({ fr: 'Message', en: 'Message', de: 'Nachricht', es: 'Mensaje', it: 'Messaggio' }),
    submitGroup: group.button_send || fallback({ fr: 'Envoyer', en: 'Send', de: 'Senden', es: 'Enviar', it: 'Invia' }),
    submitPrivate: priv.button_send || fallback({ fr: 'Envoyer', en: 'Send', de: 'Senden', es: 'Enviar', it: 'Invia' }),
    sentText: fallback({ fr: 'Demande envoyée ✅', en: 'Request sent ✅', de: 'Anfrage gesendet ✅', es: 'Solicitud enviada ✅', it: 'Richiesta inviata ✅' }),
    captcha: fallback({ fr: 'Veuillez valider le Captcha', en: 'Please validate Captcha', de: 'Bitte Captcha bestätigen', es: 'Valide el Captcha', it: 'Conferma il Captcha' }),
    error: fallback({ fr: 'Une erreur est survenue.', en: 'An error occurred.', de: 'Ein Fehler ist aufgetreten.', es: 'Se produjo un error.', it: 'Si è verificato un errore.' })
  }
}

export default function ContactForms({ lang, dict }: { lang: Lang, dict: any }) {
  const tr = tDict(dict, lang)
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const [active, setActive] = useState<'group'|'private'>('group')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const groupRef = useRef<HTMLDivElement | null>(null)
  const privateRef = useRef<HTMLDivElement | null>(null)
  const groupWidgetId = useRef<number | null>(null)
  const privateWidgetId = useRef<number | null>(null)
  const [groupToken, setGroupToken] = useState('')
  const [privateToken, setPrivateToken] = useState('')
  const [prefill, setPrefill] = useState<{ people?: number; date?: string }>({})

  useEffect(()=>{
    if (!siteKey) return
    const scriptId = 'grecaptcha-script'
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script')
      s.id = scriptId
      s.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      s.async = true
      s.defer = true
      document.body.appendChild(s)
      s.onload = () => initWidgets()
    } else {
      initWidgets()
    }
    function initWidgets() {
      if (!window.grecaptcha) return
      window.grecaptcha.ready(() => {
        if (groupRef.current && groupWidgetId.current == null) {
          groupWidgetId.current = window.grecaptcha.render(groupRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setGroupToken(token),
            'error-callback': () => setGroupToken(''),
            'expired-callback': () => setGroupToken('')
          })
        }
        if (privateRef.current && privateWidgetId.current == null) {
          privateWidgetId.current = window.grecaptcha.render(privateRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setPrivateToken(token),
            'error-callback': () => setPrivateToken(''),
            'expired-callback': () => setPrivateToken('')
          })
        }
      })
    }
  }, [siteKey])

  // Deep-link handling via hash (#contact-group or #contact-private)
  useEffect(()=>{
    const applyFromHash = () => {
      const h = window.location.hash
      if (h === '#contact-private') setActive('private')
      else if (h === '#contact-group') setActive('group')
    }
    applyFromHash()
    window.addEventListener('hashchange', applyFromHash)
    return () => window.removeEventListener('hashchange', applyFromHash)
  }, [])

  // Prefill from URL query (?people=..&date=YYYY-MM-DD)
  useEffect(()=>{
    try {
      const sp = new URLSearchParams(window.location.search)
      const p = sp.get('people')
      const d = sp.get('date')
      const people = p ? Math.max(1, Math.min(999, parseInt(p, 10) || 0)) : undefined
      const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined
      setPrefill({ people, date })
    } catch {}
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null); setOk(false)
    const fd = new FormData(e.currentTarget)
    const base = {
      firstName: (fd.get('firstName') as string || '').trim(),
      lastName: (fd.get('lastName') as string || '').trim(),
      email: (fd.get('email') as string || '').trim(),
      phone: (fd.get('phone') as string || '').trim(),
      message: (fd.get('message') as string || '').trim(),
    }
    try {
      setLoading(true)
      if (active === 'group') {
        const people = parseInt(String(fd.get('people') || '0'), 10) || 0
        const company = (fd.get('company') as string || '').trim()
        const reason = (fd.get('reason') as string || '').trim()
        const eventDate = (fd.get('eventDate') as string || '').trim()
        const eventTime = (fd.get('eventTime') as string || '').trim()
        const budget = (fd.get('budget') as string || '').trim()
        // Simple client-side validation
        if (people >= 12 && !company) { setError('Veuillez indiquer votre entreprise/raison sociale pour les groupes de 12+'); setLoading(false); return }
        if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) { setError('Format de date invalide (YYYY-MM-DD)'); setLoading(false); return }
        if (eventTime && !/^\d{2}:\d{2}$/.test(eventTime)) { setError('Format d\'heure invalide (HH:MM)'); setLoading(false); return }
        const captchaToken = siteKey ? groupToken : 'nocaptcha'
        if (siteKey && !captchaToken) { setError(tr.captcha); setLoading(false); return }
        await submitGroupRequest({ ...base, people, company, reason, eventDate, eventTime, budget, captchaToken }, lang)
      } else {
        const people = parseInt(String(fd.get('people') || '0'), 10) || undefined
        const date = (fd.get('date') as string || '').trim() || undefined
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Format de date invalide (YYYY-MM-DD)'); setLoading(false); return }
        const captchaToken = siteKey ? privateToken : 'nocaptcha'
        if (siteKey && !captchaToken) { setError(tr.captcha); setLoading(false); return }
        await submitPrivateRequest({ ...base, people, date, captchaToken }, lang)
      }
      setOk(true)
      e.currentTarget.reset()
      if (groupWidgetId.current != null && window.grecaptcha) window.grecaptcha.reset(groupWidgetId.current)
      if (privateWidgetId.current != null && window.grecaptcha) window.grecaptcha.reset(privateWidgetId.current)
      setGroupToken(''); setPrivateToken('')
    } catch (err) {
      setError(tr.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto" id="contact">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-serif font-bold text-slate-800">{tr.heading}</h3>
      </div>
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <div className="flex" id={active==='group' ? 'contact-group' : 'contact-private'}>
          <button className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide ${active==='group' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={()=>setActive('group')} type="button">{tr.groupTab}</button>
          <button className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide ${active==='private' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={()=>setActive('private')} type="button">{tr.privateTab}</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">{tr.firstName}</label>
            <input name="firstName" required className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">{tr.lastName}</label>
            <input name="lastName" required className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">{tr.email}</label>
            <input type="email" name="email" required className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">{tr.phone}</label>
            <input name="phone" className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">{tr.messageLabel}</label>
            <textarea name="message" rows={3} className="w-full p-2 border rounded" placeholder={tr.messagePlaceholder} />
          </div>
          {active==='group' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{tr.people}</label>
                <input name="people" type="number" min={1} className="w-full p-2 border rounded" required defaultValue={prefill.people ?? ''} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Entreprise / Raison sociale</label>
                <input name="company" className="w-full p-2 border rounded" placeholder="Nom de l'entreprise" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Occasion / Motif</label>
                <input name="reason" className="w-full p-2 border rounded" placeholder="Séminaire, anniversaire, EVJF, etc." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Date souhaitée</label>
                <input name="eventDate" className="w-full p-2 border rounded" placeholder="YYYY-MM-DD" defaultValue={prefill.date ?? ''} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Heure souhaitée</label>
                <input name="eventTime" className="w-full p-2 border rounded" placeholder="HH:MM" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Budget indicatif</label>
                <input name="budget" className="w-full p-2 border rounded" placeholder="Ex: 500€" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{tr.people}</label>
                <input name="people" type="number" min={1} className="w-full p-2 border rounded" defaultValue={prefill.people ?? ''} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{tr.date}</label>
                <input name="date" className="w-full p-2 border rounded" placeholder="YYYY-MM-DD" defaultValue={prefill.date ?? ''} />
              </div>
            </>
          )}
          {siteKey && (
            <div className="md:col-span-2">
              <div ref={active==='group' ? groupRef : privateRef} className="g-recaptcha" />
            </div>
          )}
          <div className="md:col-span-2 flex items-center gap-3">
            <button disabled={loading} className={`px-5 py-2 rounded font-bold text-sm ${loading ? 'bg-slate-300 text-slate-500' : 'bg-[#0f172a] text-[#eab308] hover:bg-black'} transition`}>{active==='group' ? tr.submitGroup : tr.submitPrivate}</button>
            {ok && <span className="text-green-600 font-bold text-sm">{tr.sentText}</span>}
            {error && <span className="text-red-600 font-bold text-sm">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
