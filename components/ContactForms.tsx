"use client"
import { useEffect, useRef, useState } from 'react'
import { submitGroupRequest, type Lang } from '@/lib/contactClient'

type ContactNavCopy = Record<string, string | undefined>
type ContactGroupCopy = Record<string, string | undefined>
type ContactPrivateCopy = Record<string, string | undefined>

export type ContactDict = {
  group_form?: ContactGroupCopy
  private_form?: ContactPrivateCopy
  nav?: ContactNavCopy
} & Record<string, unknown>

declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => number
      ready: (fn: () => void) => void
      reset?: (id: number) => void
    }
  }
}

function tDict(dict: ContactDict, lang: Lang) {
  // Prefer dictionary keys; fallback to internal phrases when missing
  const group = (dict.group_form ?? {}) as ContactGroupCopy
  const nav = (dict.nav ?? {}) as ContactNavCopy
  const fallback = (map: Record<Lang, string>) => map[lang]
  return {
    heading: nav.contact || fallback({ fr: 'CONTACT', en: 'CONTACT', de: 'KONTAKT', es: 'CONTACTO', it: 'CONTATTO' }),
    groupTab: group.title || fallback({ fr: 'Demande Groupe', en: 'Group Request', de: 'Gruppenanfrage', es: 'Solicitud de Grupo', it: 'Richiesta Gruppo' }),
    firstName: group.placeholder_firstname || fallback({ fr: 'Prénom', en: 'First name', de: 'Vorname', es: 'Nombre', it: 'Nome' }),
    lastName: group.placeholder_lastname || fallback({ fr: 'Nom', en: 'Last name', de: 'Nachname', es: 'Apellido', it: 'Cognome' }),
    email: group.placeholder_email || fallback({ fr: 'Email', en: 'Email', de: 'E‑Mail', es: 'Email', it: 'Email' }),
    phone: group.placeholder_phone || fallback({ fr: 'Téléphone', en: 'Phone', de: 'Telefon', es: 'Teléfono', it: 'Telefono' }),
    people: group.label_people || fallback({ fr: 'Nombre de personnes', en: 'People', de: 'Personen', es: 'Personas', it: 'Persone' }),
    messageLabel: group.message_label || fallback({ fr: 'Message / Souhaits particuliers', en: 'Message / Special Wishes', de: 'Nachricht / Sonderwünsche', es: 'Mensaje / Peticiones especiales', it: 'Messaggio / Richieste speciali' }),
    messagePlaceholder: group.placeholder_message || fallback({ fr: 'Message', en: 'Message', de: 'Nachricht', es: 'Mensaje', it: 'Messaggio' }),
    companyLabel: group.label_company || fallback({ fr: 'Entreprise / Raison sociale', en: 'Company / Business name', de: 'Firma / Unternehmensname', es: 'Empresa / Razón social', it: 'Azienda / Ragione sociale' }),
    companyPlaceholder: group.placeholder_company || fallback({ fr: "Nom de l'entreprise", en: 'Company name', de: 'Firmenname', es: 'Nombre de la empresa', it: "Nome dell'azienda" }),
    reasonLabel: group.label_reason || fallback({ fr: 'Occasion / Motif', en: 'Occasion / Reason', de: 'Anlass / Grund', es: 'Ocasión / Motivo', it: 'Occasione / Motivo' }),
    reasonPlaceholder: group.placeholder_reason || fallback({ fr: 'Séminaire, anniversaire, EVJF, etc.', en: 'Seminar, birthday, bachelorette, etc.', de: 'Seminar, Geburtstag, Junggesellinnenabschied, usw.', es: 'Seminario, cumpleaños, despedida de soltera, etc.', it: 'Seminario, compleanno, addio al nubilato, ecc.' }),
    eventDateLabel: group.label_event_date || fallback({ fr: 'Date souhaitée', en: 'Requested date', de: 'Wunschtermin', es: 'Fecha solicitada', it: 'Data richiesta' }),
    eventDatePlaceholder: group.placeholder_event_date || fallback({ fr: 'YYYY-MM-DD', en: 'YYYY-MM-DD', de: 'YYYY-MM-DD', es: 'YYYY-MM-DD', it: 'YYYY-MM-DD' }),
    eventTimeLabel: group.label_event_time || fallback({ fr: 'Heure souhaitée', en: 'Requested time', de: 'Gewünschte Uhrzeit', es: 'Hora solicitada', it: 'Orario richiesto' }),
    eventTimePlaceholder: group.placeholder_event_time || fallback({ fr: 'HH:MM', en: 'HH:MM', de: 'HH:MM', es: 'HH:MM', it: 'HH:MM' }),
    budgetLabel: group.label_budget || fallback({ fr: 'Budget indicatif', en: 'Indicative budget', de: 'Richtbudget', es: 'Presupuesto indicativo', it: 'Budget indicativo' }),
    budgetPlaceholder: group.placeholder_budget || fallback({ fr: 'Ex: 500€', en: 'Ex: €500', de: 'Z. B.: 500€', es: 'Ej: 500€', it: 'Es: 500€' }),
    submitGroup: group.button_send || fallback({ fr: 'Envoyer', en: 'Send', de: 'Senden', es: 'Enviar', it: 'Invia' }),
    sentText: fallback({ fr: 'Demande envoyée ✅', en: 'Request sent ✅', de: 'Anfrage gesendet ✅', es: 'Solicitud enviada ✅', it: 'Richiesta inviata ✅' }),
    captcha: fallback({ fr: 'Veuillez valider le Captcha', en: 'Please validate Captcha', de: 'Bitte Captcha bestätigen', es: 'Valide el Captcha', it: 'Conferma il Captcha' }),
    error: fallback({ fr: 'Une erreur est survenue.', en: 'An error occurred.', de: 'Ein Fehler ist aufgetreten.', es: 'Se produjo un error.', it: 'Si è verificato un errore.' })
  }
}

export default function ContactForms({ lang, dict }: { lang: Lang, dict: ContactDict }) {
  const tr = tDict(dict, lang)
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const groupRef = useRef<HTMLDivElement | null>(null)
  const groupWidgetId = useRef<number | null>(null)
  const [groupToken, setGroupToken] = useState('')
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
      const grecaptcha = window.grecaptcha
      if (!grecaptcha) return
      grecaptcha.ready(() => {
        if (groupRef.current && groupWidgetId.current == null) {
          groupWidgetId.current = grecaptcha.render(groupRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setGroupToken(token),
            'error-callback': () => setGroupToken(''),
            'expired-callback': () => setGroupToken('')
          })
        }
      })
    }
  }, [siteKey])

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
      setOk(true)
      e.currentTarget.reset()
      if (groupWidgetId.current != null) window.grecaptcha?.reset?.(groupWidgetId.current)
      setGroupToken('')
    } catch {
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
      <div className="sn-card overflow-hidden">
        <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-firstName" className="block text-xs font-bold text-slate-500 mb-1">{tr.firstName}</label>
            <input id="contact-firstName" name="firstName" required className="w-full p-2 border rounded" />
          </div>
          <div>
            <label htmlFor="contact-lastName" className="block text-xs font-bold text-slate-500 mb-1">{tr.lastName}</label>
            <input id="contact-lastName" name="lastName" required className="w-full p-2 border rounded" />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-xs font-bold text-slate-500 mb-1">{tr.email}</label>
            <input id="contact-email" type="email" name="email" required className="w-full p-2 border rounded" />
          </div>
          <div>
            <label htmlFor="contact-phone" className="block text-xs font-bold text-slate-500 mb-1">{tr.phone}</label>
            <input id="contact-phone" name="phone" className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="contact-message" className="block text-xs font-bold text-slate-500 mb-1">{tr.messageLabel}</label>
            <textarea id="contact-message" name="message" rows={3} className="w-full p-2 border rounded" placeholder={tr.messagePlaceholder} />
          </div>
          <div>
            <label htmlFor="contact-people-group" className="block text-xs font-bold text-slate-500 mb-1">{tr.people}</label>
            <input id="contact-people-group" name="people" type="number" min={1} className="w-full p-2 border rounded" required defaultValue={prefill.people ?? ''} />
          </div>
          <div>
             <label htmlFor="contact-company" className="block text-xs font-bold text-slate-500 mb-1">{tr.companyLabel}</label>
             <input id="contact-company" name="company" className="w-full p-2 border rounded" placeholder={tr.companyPlaceholder} />
          </div>
          <div className="md:col-span-2">
             <label htmlFor="contact-reason" className="block text-xs font-bold text-slate-500 mb-1">{tr.reasonLabel}</label>
             <input id="contact-reason" name="reason" className="w-full p-2 border rounded" placeholder={tr.reasonPlaceholder} />
          </div>
          <div>
             <label htmlFor="contact-eventDate" className="block text-xs font-bold text-slate-500 mb-1">{tr.eventDateLabel}</label>
             <input id="contact-eventDate" name="eventDate" className="w-full p-2 border rounded" placeholder={tr.eventDatePlaceholder} defaultValue={prefill.date ?? ''} />
          </div>
          <div>
             <label htmlFor="contact-eventTime" className="block text-xs font-bold text-slate-500 mb-1">{tr.eventTimeLabel}</label>
             <input id="contact-eventTime" name="eventTime" className="w-full p-2 border rounded" placeholder={tr.eventTimePlaceholder} />
          </div>
          <div className="md:col-span-2">
             <label htmlFor="contact-budget" className="block text-xs font-bold text-slate-500 mb-1">{tr.budgetLabel}</label>
             <input id="contact-budget" name="budget" className="w-full p-2 border rounded" placeholder={tr.budgetPlaceholder} />
          </div>
          {siteKey && (
            <div className="md:col-span-2">
              <div ref={groupRef} className="g-recaptcha" />
            </div>
          )}
          <div className="md:col-span-2 flex items-center gap-3">
            <button disabled={loading} className={`sn-btn-primary ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>{tr.submitGroup}</button>
            {ok && <span className="text-green-600 font-bold text-sm">{tr.sentText}</span>}
            {error && <span className="text-red-600 font-bold text-sm">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
