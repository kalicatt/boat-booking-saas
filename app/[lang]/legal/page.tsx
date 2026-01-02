import OptimizedImage from '@/components/OptimizedImage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SUPPORTED_LANGS = ['fr', 'en', 'de', 'es', 'it'] as const

type Lang = (typeof SUPPORTED_LANGS)[number]
type LegalSection = readonly [string, readonly string[]]
type LegalContent = {
  title: string
  update: (d: Date) => string
  sections: LegalSection[]
}

const legal = {
  fr: {
    title: 'Mentions Légales',
    update: (d: Date) => `Dernière mise à jour : ${d.toLocaleDateString('fr-FR')}`,
    sections: [
      [
        'Éditeur du site',
        [
          'SWEET NARCISSE SARL',
          'Pont Saint-Pierre, 68000 Colmar, France',
          'SIRET : 411 918 782 00037',
          'Responsable de la publication : SWEET NARCISSE SARL'
        ]
      ],
      [
        'Contact',
        [
          'Téléphone : +33 3 89 20 68 92',
          'E-mail : contact@sweet-narcisse.fr'
        ]
      ],
      [
        'Conception & développement',
        [
          'Lucas Servais – conception et intégration web.',
          'Le présent site est fourni à SWEET NARCISSE SARL dans un cadre de démonstration ; les droits patrimoniaux demeurent la propriété de Lucas Servais jusqu’à la cession finale.'
        ]
      ],
      [
        'Hébergement',
        [
          'OVHcloud (OVH SAS)',
          '2 rue Kellermann, 59100 Roubaix, France',
          'https://www.ovhcloud.com'
        ]
      ],
      [
        'Propriété intellectuelle',
        [
          "Les contenus, visuels, photographies et développements du site sont protégés par le droit de la propriété intellectuelle.",
          'Toute reproduction, représentation, adaptation ou exploitation, partielle ou totale, sans accord écrit préalable de Lucas Servais ou de SWEET NARCISSE SARL est interdite.',
          'Lucas Servais conserve l’intégralité des droits patrimoniaux tant que la cession commerciale n’est pas finalisée ; une licence de démonstration est accordée à SWEET NARCISSE SARL pour la période de prévente.'
        ]
      ],
      [
        'Données personnelles',
        [
          'Les données collectées servent uniquement à la gestion des réservations, à la relation client et au suivi des paiements. Vous disposez d’un droit d’accès, de rectification et d’opposition en écrivant à contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookies',
        [
          'Seuls des cookies techniques essentiels et des services tiers nécessaires (Stripe, PayPal, outils de mesure) sont utilisés. Vous pouvez ajuster vos préférences depuis votre navigateur.'
        ]
      ]
    ] as const
  },
  en: {
    title: 'Legal Notice',
    update: (d: Date) => `Last updated: ${d.toLocaleDateString('en-GB')}`,
    sections: [
      [
        'Publisher',
        [
          'SWEET NARCISSE SARL',
          'Pont Saint-Pierre, 68000 Colmar, France',
          'SIRET: 411 918 782 00037',
          'Publishing director: SWEET NARCISSE SARL'
        ]
      ],
      [
        'Contact',
        [
          'Phone: +33 3 89 20 68 92',
          'Email: contact@sweet-narcisse.fr'
        ]
      ],
      [
        'Design & development',
        [
          'Lucas Servais – design and front-end build.',
          'This website is currently provided to SWEET NARCISSE SARL as a demo; intellectual property rights remain with Lucas Servais until the final transfer.'
        ]
      ],
      [
        'Hosting',
        [
          'OVHcloud (OVH SAS)',
          '2 rue Kellermann, 59100 Roubaix, France',
          'https://www.ovhcloud.com'
        ]
      ],
      [
        'Intellectual Property',
        [
          'All content, visuals and source code are protected by intellectual property laws.',
          'Any reproduction, representation, adaptation or exploitation requires prior written consent from Lucas Servais or SWEET NARCISSE SARL.',
          'Lucas Servais retains full economic rights until the commercial transfer is executed; a demo licence is granted to SWEET NARCISSE SARL for the pre-sale period.'
        ]
      ],
      [
        'Personal Data',
        [
          'Collected data is used solely for booking management, customer care and payment follow-up. You may exercise access, rectification or objection rights by emailing contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookies',
        [
          'Only essential technical cookies and required third-party services (Stripe, PayPal, analytics) are used. You can adjust preferences directly in your browser settings.'
        ]
      ]
    ] as const
  },
  de: {
    title: 'Impressum',
    update: (d: Date) => `Letzte Aktualisierung: ${d.toLocaleDateString('de-DE')}`,
    sections: [
      [
        'Anbieter',
        [
          'SWEET NARCISSE SARL',
          'Pont Saint-Pierre, 68000 Colmar, Frankreich',
          'SIRET: 411 918 782 00037',
          'Verantwortlich für den Inhalt: SWEET NARCISSE SARL'
        ]
      ],
      [
        'Kontakt',
        [
          'Telefon: +33 3 89 20 68 92',
          'E-Mail: contact@sweet-narcisse.fr'
        ]
      ],
      [
        'Konzeption & Entwicklung',
        [
          'Lucas Servais – Konzeption und Frontend-Entwicklung.',
          'Die Website wird SWEET NARCISSE SARL derzeit zu Demonstrationszwecken bereitgestellt; die Nutzungsrechte verbleiben bis zur endgültigen Übertragung bei Lucas Servais.'
        ]
      ],
      [
        'Hosting',
        [
          'OVHcloud (OVH SAS)',
          '2 rue Kellermann, 59100 Roubaix, Frankreich',
          'https://www.ovhcloud.com'
        ]
      ],
      [
        'Urheberrecht & geistiges Eigentum',
        [
          'Alle Inhalte, Visuals und Quellcodes dieser Website unterliegen dem Schutz des geistigen Eigentums.',
          'Eine ganz oder teilweise Nutzung, Vervielfältigung oder Verwertung bedarf der vorherigen schriftlichen Zustimmung von Lucas Servais oder SWEET NARCISSE SARL.',
          'Lucas Servais behält sämtliche Nutzungsrechte, solange die kommerzielle Übertragung nicht abgeschlossen ist; SWEET NARCISSE SARL verfügt über eine Demo-Lizenz für die Vorverkaufsphase.'
        ]
      ],
      [
        'Personenbezogene Daten',
        [
          'Erhobene Daten werden ausschließlich zur Abwicklung von Buchungen, Kundenservice und Zahlungsnachverfolgung genutzt. Rechte auf Auskunft, Berichtigung oder Widerspruch können per E-Mail an contact@sweet-narcisse.fr ausgeübt werden.'
        ]
      ],
      [
        'Cookies',
        [
          'Es werden nur notwendige technische Cookies und erforderliche Drittanbieterdienste (Stripe, PayPal, Analysewerkzeuge) eingesetzt. Einstellungen können über den Browser angepasst werden.'
        ]
      ]
    ] as const
  },
  es: {
    title: 'Aviso Legal',
    update: (d: Date) => `Última actualización: ${d.toLocaleDateString('es-ES')}`,
    sections: [
      [
        'Editor',
        [
          'SWEET NARCISSE SARL',
          'Pont Saint-Pierre, 68000 Colmar, Francia',
          'SIRET: 411 918 782 00037',
          'Responsable de la publicación: SWEET NARCISSE SARL'
        ]
      ],
      [
        'Contacto',
        [
          'Teléfono: +33 3 89 20 68 92',
          'Email: contact@sweet-narcisse.fr'
        ]
      ],
      [
        'Diseño y desarrollo',
        [
          'Lucas Servais – diseño e integración web.',
          'Este sitio se facilita a SWEET NARCISSE SARL como demo; los derechos patrimoniales permanecen en Lucas Servais hasta la transferencia definitiva.'
        ]
      ],
      [
        'Alojamiento',
        [
          'OVHcloud (OVH SAS)',
          '2 rue Kellermann, 59100 Roubaix, Francia',
          'https://www.ovhcloud.com'
        ]
      ],
      [
        'Propiedad intelectual',
        [
          'Todos los contenidos, recursos visuales y código fuente están protegidos por derechos de propiedad intelectual.',
          'Cualquier reproducción, representación, adaptación o explotación requiere autorización previa y por escrito de Lucas Servais o de SWEET NARCISSE SARL.',
          'Lucas Servais mantiene los derechos patrimoniales mientras la venta no esté cerrada; SWEET NARCISSE SARL dispone de una licencia de demostración durante la fase previa.'
        ]
      ],
      [
        'Datos personales',
        [
          'Los datos recogidos se utilizan únicamente para la gestión de reservas, la atención al cliente y el seguimiento de pagos. Puede ejercer sus derechos de acceso, rectificación u oposición escribiendo a contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookies',
        [
          'Solo se emplean cookies técnicas esenciales y servicios de terceros necesarios (Stripe, PayPal, analítica). Puede ajustar sus preferencias desde la configuración de su navegador.'
        ]
      ]
    ] as const
  },
  it: {
    title: 'Note Legali',
    update: (d: Date) => `Ultimo aggiornamento: ${d.toLocaleDateString('it-IT')}`,
    sections: [
      [
        'Editore',
        [
          'SWEET NARCISSE SARL',
          'Pont Saint-Pierre, 68000 Colmar, Francia',
          'SIRET: 411 918 782 00037',
          'Responsabile della pubblicazione: SWEET NARCISSE SARL'
        ]
      ],
      [
        'Contatti',
        [
          'Telefono: +33 3 89 20 68 92',
          'Email: contact@sweet-narcisse.fr'
        ]
      ],
      [
        'Progettazione & sviluppo',
        [
          'Lucas Servais – progettazione e integrazione web.',
          'Il sito è attualmente fornito a SWEET NARCISSE SARL come demo; i diritti patrimoniali restano in capo a Lucas Servais fino al trasferimento definitivo.'
        ]
      ],
      [
        'Hosting',
        [
          'OVHcloud (OVH SAS)',
          '2 rue Kellermann, 59100 Roubaix, Francia',
          'https://www.ovhcloud.com'
        ]
      ],
      [
        'Proprietà intellettuale',
        [
          'Tutti i contenuti, i materiali visivi e il codice sorgente del sito sono protetti dal diritto d’autore.',
          'Qualsiasi riproduzione, rappresentazione, adattamento o utilizzo richiede l’autorizzazione scritta di Lucas Servais o di SWEET NARCISSE SARL.',
          'Lucas Servais conserva i diritti patrimoniali finché la cessione commerciale non sarà finalizzata; a SWEET NARCISSE SARL è concessa una licenza dimostrativa per la fase di prevendita.'
        ]
      ],
      [
        'Dati personali',
        [
          'I dati raccolti vengono utilizzati esclusivamente per la gestione delle prenotazioni, l’assistenza clienti e il follow-up dei pagamenti. È possibile esercitare i diritti di accesso, rettifica o opposizione scrivendo a contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookie',
        [
          'Sono impiegati solo cookie tecnici essenziali e servizi di terze parti necessari (Stripe, PayPal, strumenti di analisi). Le preferenze possono essere regolate nelle impostazioni del browser.'
        ]
      ]
    ] as const
  }
} satisfies Record<Lang, LegalContent>

export default async function LegalPage({ params }: { params: Promise<{ lang?: string }> }) {
  const resolved = await params
  const rawLang = resolved?.lang ?? 'fr'
  const lang = SUPPORTED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'fr'
  const c = legal[lang]
  const now = new Date()

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0d1b2a] via-[#112a3b] to-[#0d1b2a] py-16">
      <div className="max-w-4xl mx-auto px-6">
        <header className="text-center text-slate-100 mb-12">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-5 py-2 backdrop-blur">
            <OptimizedImage
              src="/images/logo.webp"
              fallback="/images/logo.jpg"
              alt="Sweet Narcisse"
              width={128}
              height={32}
              className="h-8 w-auto rounded-sm"
              priority
            />
            <span className="text-xs font-semibold tracking-[0.22em] uppercase text-slate-200">Sweet Narcisse</span>
          </div>
          <h1 className="mt-6 text-4xl font-serif font-bold text-white">{c.title}</h1>
          <p className="mt-3 text-sm text-slate-300">{c.update(now)}</p>
        </header>
        <div className="space-y-6">
          {c.sections.map((section, idx) => (
            <article
              key={idx}
              className="sn-card bg-white/95 border border-white/40 px-6 py-6 shadow-xl backdrop-blur"
            >
              <h2 className="text-xl font-semibold text-[#0f172a] mb-3">{section[0]}</h2>
              <div className="space-y-2 text-sm leading-relaxed text-slate-600">
                {section[1].map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
