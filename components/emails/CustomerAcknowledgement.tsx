import * as React from 'react'

type Lang = 'fr' | 'en' | 'de' | 'es' | 'it'

interface AckProps {
  firstName: string
  kind: 'group' | 'private'
  people?: number
  date?: string
  lang?: Lang
}

const t = (lang: Lang) => ({
  receipt: {
    fr: 'Accusé de réception',
    en: 'Acknowledgement',
    de: 'Eingangsbestätigung',
    es: 'Acuse de recibo',
    it: 'Conferma di ricezione'
  }[lang],
  hello: {
    fr: (n: string) => `Bonjour ${n},`,
    en: (n: string) => `Hello ${n},`,
    de: (n: string) => `Hallo ${n},`,
    es: (n: string) => `Hola ${n},`,
    it: (n: string) => `Ciao ${n},`
  }[lang],
  thanks: (kind: 'group' | 'private') => ({
    fr: kind === 'group' ? 'Merci pour votre demande de groupe. Nous revenons vers vous au plus vite.' : 'Merci pour votre demande de privatisation. Nous revenons vers vous au plus vite.',
    en: kind === 'group' ? 'Thank you for your group request. We will get back to you shortly.' : 'Thank you for your private booking request. We will get back to you shortly.',
    de: kind === 'group' ? 'Vielen Dank für Ihre Gruppenanfrage. Wir melden uns in Kürze.' : 'Vielen Dank für Ihre Privatisierungsanfrage. Wir melden uns in Kürze.',
    es: kind === 'group' ? 'Gracias por su solicitud de grupo. Le responderemos en breve.' : 'Gracias por su solicitud de privatización. Le responderemos en breve.',
    it: kind === 'group' ? 'Grazie per la richiesta di gruppo. La ricontatteremo al più presto.' : 'Grazie per la richiesta di privatizzazione. La ricontatteremo al più presto.'
  }[lang]),
  groupLabel: {
    fr: '👥 Groupe :',
    en: '👥 Group:',
    de: '👥 Gruppe:',
    es: '👥 Grupo:',
    it: '👥 Gruppo:'
  }[lang],
  people: {
    fr: (n: number) => `${n} personnes`,
    en: (n: number) => `${n} people`,
    de: (n: number) => `${n} Personen`,
    es: (n: number) => `${n} personas`,
    it: (n: number) => `${n} persone`
  }[lang],
  dateLabel: {
    fr: '📅 Date souhaitée :',
    en: '📅 Requested date:',
    de: '📅 Wunschtermin:',
    es: '📅 Fecha solicitada:',
    it: '📅 Data richiesta:'
  }[lang],
  cancel1: {
    fr: 'Rappel annulation: >48h 100% • 48–24h 50% • <24h/no‑show 0%.',
    en: 'Cancellation reminder: >48h 100% • 48–24h 50% • <24h/no‑show 0%.',
    de: 'Stornierung: >48h 100% • 48–24h 50% • <24h/No‑Show 0%.',
    es: 'Cancelación: >48h 100% • 48–24h 50% • <24h/no‑show 0%.',
    it: 'Cancellazione: >48h 100% • 48–24h 50% • <24h/no‑show 0%.'
  }[lang],
  cancel2: {
    fr: 'Météo sévère (alerte orange/rouge): remboursement intégral.',
    en: 'Severe weather (orange/red alert): full refund.',
    de: 'Schweres Wetter (Warnstufe Orange/Rot): vollständige Erstattung.',
    es: 'Clima severo (alerta naranja/roja): reembolso total.',
    it: 'Meteo avverso (allerta arancione/rossa): rimborso totale.'
  }[lang],
  details: {
    fr: 'Détails',
    en: 'Details',
    de: 'Details',
    es: 'Detalles',
    it: 'Dettagli'
  }[lang],
  cgv: {
    fr: 'CGV',
    en: 'Terms',
    de: 'AGB',
    es: 'Condiciones',
    it: 'Condizioni'
  }[lang],
  closing: {
    fr: 'À bientôt sur l’eau,',
    en: 'See you on the water,',
    de: 'Bis bald auf dem Wasser,',
    es: 'Hasta pronto en el agua,',
    it: "A presto sull’acqua,"
  }[lang],
  team: {
    fr: "L’équipe Sweet Narcisse",
    en: 'Sweet Narcisse team',
    de: 'Sweet Narcisse Team',
    es: 'Equipo Sweet Narcisse',
    it: 'Team Sweet Narcisse'
  }[lang]
})

export const CustomerAcknowledgement: React.FC<Readonly<AckProps>> = ({ firstName, kind, people, date, lang = 'fr' }) => {
  const tr = t(lang)
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', maxWidth: 600, margin: '0 auto', border: '1px solid #ddd', borderRadius: 8 }}>
      <div style={{ backgroundColor: '#0f172a', padding: 20, textAlign: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
        <h1 style={{ color: '#eab308', margin: 0, fontSize: 20 }}>Sweet Narcisse</h1>
        <p style={{ color: 'white', margin: '5px 0 0', fontSize: 14 }}>{tr.receipt}</p>
      </div>
      <div style={{ padding: 20 }}>
        <h2 style={{ color: '#0f172a' }}>{tr.hello(firstName)}</h2>
        <p>{tr.thanks(kind)}</p>
        {(people || date) && (
          <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', margin: '16px 0' }}>
            {typeof people === 'number' && <p style={{ margin: 0 }}><strong>{tr.groupLabel}</strong> {tr.people(people)}</p>}
            {date && <p style={{ margin: 0 }}><strong>{tr.dateLabel}</strong> {date}</p>}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginTop: 10 }}>
          <p style={{ margin: '0 0 6px' }}>{tr.cancel1}</p>
          <p style={{ margin: '0 0 6px' }}>{tr.cancel2}</p>
          <p style={{ margin: 0 }}>
            {tr.details}: <a href={`/${lang}/cgv`} style={{ color: '#2563eb' }}>{tr.cgv}</a>
          </p>
        </div>
        <p style={{ fontSize: 12, color: '#666', marginTop: 20 }}>{tr.closing}</p>
        <p style={{ fontSize: 12, color: '#0f172a', fontWeight: 'bold', marginTop: 4 }}>{tr.team}</p>
      </div>
    </div>
  )
}

