export const dynamic = 'force-dynamic'
export const revalidate = 0

const legal = {
  fr: {
    title: 'Mentions Légales',
    update: (d: Date) => `Dernière mise à jour: ${d.toLocaleDateString('fr-FR')}`,
    sections: [
      ['Éditeur du site', `Sweet Narcisse – Promenades en barque à Colmar\nPont Saint‑Pierre, 68000 Colmar, France`],
      ['Contact', `Téléphone: +33 3 89 20 68 92\nE‑mail: contact@sweet-narcisse.fr`],
      ['Hébergement', `Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA`],
      ['Propriété intellectuelle', `Contenus protégés par le droit d'auteur. Toute reproduction non autorisée est interdite.`],
      ['Données personnelles', `Données traitées pour réservations et relation client; droits d'accès et rectification.`],
      ['Cookies', `Cookies techniques + services tiers (Stripe, PayPal, reCAPTCHA) si nécessaires.`],
    ]
  },
  en: {
    title: 'Legal Notice',
    update: (d: Date) => `Last updated: ${d.toLocaleDateString('en-GB')}`,
    sections: [
      ['Publisher', `Sweet Narcisse – Boat rides in Colmar\nPont Saint‑Pierre, 68000 Colmar, France`],
      ['Contact', `Phone: +33 3 89 20 68 92\nEmail: contact@sweet-narcisse.fr`],
      ['Hosting', `Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA`],
      ['Intellectual Property', `All content is copyright‑protected. Unauthorized reproduction is prohibited.`],
      ['Personal Data', `Data processed for booking and customer care; data subject rights apply.`],
      ['Cookies', `Technical cookies and third‑party services (Stripe, PayPal, reCAPTCHA) as needed.`],
    ]
  },
  de: {
    title: 'Impressum',
    update: (d: Date) => `Letzte Aktualisierung: ${d.toLocaleDateString('de-DE')}`,
    sections: [
      ['Anbieter', `Sweet Narcisse – Bootstouren in Colmar\nPont Saint‑Pierre, 68000 Colmar, Frankreich`],
      ['Kontakt', `Telefon: +33 3 89 20 68 92\nE‑Mail: contact@sweet-narcisse.fr`],
      ['Hosting', `Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA`],
      ['Urheberrecht', `Inhalte urheberrechtlich geschützt; unbefugte Vervielfältigung verboten.`],
      ['Personenbezogene Daten', `Datenverarbeitung für Buchungen/Kundenservice; Betroffenenrechte gelten.`],
      ['Cookies', `Technische Cookies + Drittanbieter (Stripe, PayPal, reCAPTCHA) nach Bedarf.`],
    ]
  },
  es: {
    title: 'Aviso Legal',
    update: (d: Date) => `Última actualización: ${d.toLocaleDateString('es-ES')}`,
    sections: [
      ['Editor', `Sweet Narcisse – Paseos en barca en Colmar\nPont Saint‑Pierre, 68000 Colmar, Francia`],
      ['Contacto', `Teléfono: +33 3 89 20 68 92\nEmail: contact@sweet-narcisse.fr`],
      ['Alojamiento', `Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA`],
      ['Propiedad intelectual', `Contenidos protegidos por derechos de autor. Reproducción no autorizada prohibida.`],
      ['Datos personales', `Datos tratados para reservas y atención; derechos del interesado aplican.`],
      ['Cookies', `Cookies técnicas y servicios de terceros (Stripe, PayPal, reCAPTCHA) cuando sea necesario.`],
    ]
  },
  it: {
    title: 'Note Legali',
    update: (d: Date) => `Ultimo aggiornamento: ${d.toLocaleDateString('it-IT')}`,
    sections: [
      ['Editore', `Sweet Narcisse – Giri in barca a Colmar\nPont Saint‑Pierre, 68000 Colmar, Francia`],
      ['Contatti', `Telefono: +33 3 89 20 68 92\nEmail: contact@sweet-narcisse.fr`],
      ['Hosting', `Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA`],
      ['Proprietà intellettuale', `Contenuti protetti da copyright; riproduzione non autorizzata vietata.`],
      ['Dati personali', `Dati trattati per prenotazioni e assistenza; diritti degli interessati applicabili.`],
      ['Cookie', `Cookie tecnici e servizi terzi (Stripe, PayPal, reCAPTCHA) se necessari.`],
    ]
  },
} as const

export default function LegalPage({ params }: { params: { lang: keyof typeof legal } }) {
  const lang = (['fr','en','de','es','it'] as const).includes(params.lang as any) ? params.lang : 'fr'
  const c = legal[lang]
  const now = new Date()
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
      <h1>{c.title}</h1>
      {c.sections.map((sec, idx) => (
        <section key={idx}>
          <h2>{sec[0]}</h2>
          {(sec[1] as string).split('\n').map((p, i) => (<p key={i}>{p}</p>))}
        </section>
      ))}
      <p className="text-sm text-slate-500">{c.update(now)}</p>
    </main>
  )
}
