import Image from "next/image"
import OptimizedImage from '@/components/OptimizedImage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SUPPORTED_LANGS = ['fr', 'en', 'de', 'es', 'it'] as const

type Lang = (typeof SUPPORTED_LANGS)[number]
type SectionContent = readonly [string, readonly string[]]
type PrivacyContent = {
  title: string
  update: (d: Date) => string
  intro: string
  sections: SectionContent[]
}

const privacy = {
  fr: {
    title: 'Politique de Confidentialité',
    update: (d: Date) => `Dernière mise à jour : ${d.toLocaleDateString('fr-FR')}`,
    intro:
      "Cette politique décrit la manière dont SWEET NARCISSE SARL collecte, utilise et protège les données personnelles dans le cadre de la démonstration du site. Une licence de démonstration est accordée par Lucas Servais, qui conserve la pleine propriété intellectuelle tant que la cession commerciale n'est pas finalisée.",
    sections: [
      [
        'Responsable du traitement',
        [
          'SWEET NARCISSE SARL, Pont Saint-Pierre, 68000 Colmar, France',
          'Contact : contact@sweet-narcisse.fr, +33 3 89 20 68 92'
        ]
      ],
      [
        'Données collectées',
        [
          'Informations d’identité et de contact (nom, prénom, email, téléphone).',
          'Détails de réservation (date de séjour, nombre de personnes, préférences).',
          'Historique d’échanges avec notre service client.',
          'Données de paiement traitées via des prestataires tiers (Stripe, PayPal) sans que nous stockions les informations de carte bancaire.'
        ]
      ],
      [
        'Finalités du traitement',
        [
          'Gestion des demandes de réservation et des contrats de séjour.',
          'Suivi de la relation client (réponses aux demandes, suivi post-séjour).',
          'Gestion comptable et obligations légales.',
          'Analyse anonyme des performances du site pour améliorer l’expérience utilisateur.'
        ]
      ],
      [
        'Destinataires',
        [
          'Personnel habilité de SWEET NARCISSE SARL.',
          'Sous-traitants techniques et outils tiers nécessaires (hébergement OVH, solutions d’envoi d’emails, outils d’analytics).',
          'Prestataires de paiement comme Stripe ou PayPal (données de paiement).',
          'Lucas Servais en tant que concepteur du site, uniquement pour la maintenance technique dans le cadre du contrat de démonstration.'
        ]
      ],
      [
        'Durées de conservation',
        [
          'Données clients : durée de la relation contractuelle puis 5 ans (prescriptions légales).',
          'Enregistrements comptables : 10 ans conformément à la loi.',
          'Données issues de cookies : 13 mois maximum.',
          'Logs techniques : 12 mois maximum, strictement pour la sécurité et la maintenance.'
        ]
      ],
      [
        'Droits des personnes',
        [
          'Accès, rectification, effacement, opposition, limitation et portabilité.',
          'Retrait du consentement à tout moment lorsque celui-ci est la base légale.',
          'Droit d’introduire une réclamation auprès de la CNIL (www.cnil.fr).',
          'Pour exercer vos droits : contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookies et traceurs',
        [
          'Utilisation limitée aux cookies techniques essentiels, aux outils de paiement (Stripe, PayPal) et à des mesures anonymisées de fréquentation.',
          'Vous pouvez paramétrer votre navigateur pour refuser tout ou partie des cookies, mais cela peut impacter certaines fonctionnalités.',
          'Aucun cookie publicitaire n’est exploité dans la version de démonstration.'
        ]
      ],
      [
        'Sécurité',
        [
          'Mesures techniques et organisationnelles mises en œuvre pour protéger les données contre la perte, l’altération ou l’accès non autorisé.',
          'Accès restreint aux seules personnes habilitées nécessitant les informations pour leurs missions.',
          'Tests réguliers et mise à jour des systèmes pour limiter les vulnérabilités.'
        ]
      ],
      [
        'Transferts hors UE',
        [
          'Les données sont principalement hébergées en Union européenne via OVH.',
          "Si certains prestataires (ex : services d'emailing, outils SaaS) impliquent un transfert hors UE, des clauses contractuelles types et garanties équivalentes au RGPD sont mises en place." 
        ]
      ],
      [
        'Propriété intellectuelle et licence de démonstration',
        [
          "Les contenus et développements du site sont réalisés par Lucas Servais, qui en conserve la propriété intellectuelle jusqu’au transfert définitif.",
          'SWEET NARCISSE SARL exploite le site sous licence de démonstration afin de présenter son offre commerciale.',
          'Toute réutilisation des contenus nécessite l’accord écrit de Lucas Servais ou de SWEET NARCISSE SARL.'
        ]
      ]
    ] as const
  },
  en: {
    title: 'Privacy Policy',
    update: (d: Date) => `Last updated: ${d.toLocaleDateString('en-GB')}`,
    intro:
      'This policy explains how SWEET NARCISSE SARL collects, processes, and protects personal data in the context of this website demo. A demonstration licence is granted by Lucas Servais, who retains full intellectual property rights until the commercial transfer is completed.',
    sections: [
      [
        'Data Controller',
        [
          'SWEET NARCISSE SARL, Pont Saint-Pierre, 68000 Colmar, France',
          'Contact: contact@sweet-narcisse.fr, +33 3 89 20 68 92'
        ]
      ],
      [
        'Data We Collect',
        [
          'Identity and contact details (first name, last name, email, phone).',
          'Booking information (stay dates, number of guests, preferences).',
          'Customer service history and communications.',
          'Payment data processed via third-party providers (Stripe, PayPal); no card data is stored on this site.'
        ]
      ],
      [
        'Purposes',
        [
          'Managing booking requests and accommodation contracts.',
          'Customer relationship management (responses, follow-up messages).',
          'Accounting and legal obligations.',
          'Anonymous performance analytics to improve user experience.'
        ]
      ],
      [
        'Recipients',
        [
          'Authorised staff of SWEET NARCISSE SARL.',
          'Technical processors and essential third-party tools (OVH hosting, email services, analytics).',
          'Payment providers such as Stripe or PayPal (payment data).',
          'Lucas Servais as the site designer, only for technical maintenance under the demo agreement.'
        ]
      ],
      [
        'Retention Periods',
        [
          'Customer data: duration of the contractual relationship plus 5 years to meet statutory requirements.',
          'Accounting records: 10 years in accordance with legal obligations.',
          'Cookie data: up to 13 months.',
          'Technical logs: up to 12 months for security and maintenance purposes only.'
        ]
      ],
      [
        'Your Rights',
        [
          'Rights of access, rectification, erasure, objection, restriction, and portability.',
          'Right to withdraw consent at any time when processing is based on consent.',
          'Right to lodge a complaint with the CNIL (www.cnil.fr).',
          'To exercise your rights, contact: contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookies and Trackers',
        [
          'Use limited to essential technical cookies, payment tools (Stripe, PayPal), and anonymised analytics.',
          'You can configure your browser to refuse cookies, but this may affect certain features.',
          'No advertising or profiling cookies are deployed in this demo environment.'
        ]
      ],
      [
        'Security Measures',
        [
          'Technical and organisational safeguards protect data against loss, alteration, or unauthorised access.',
          'Restricted access granted only to personnel who require the data for their duties.',
          'Regular testing, updates, and monitoring reduce potential vulnerabilities.'
        ]
      ],
      [
        'Transfers Outside the EU',
        [
          'Data is primarily hosted within the European Union through OVH.',
          'Where third-party tools (e.g. email services, SaaS platforms) involve transfers outside the EU, Standard Contractual Clauses and equivalent safeguards are implemented.' 
        ]
      ],
      [
        'Intellectual Property & Demo Licence',
        [
          'All site content and code were created by Lucas Servais, who retains intellectual property until the final transfer.',
          'SWEET NARCISSE SARL operates the site under a demonstration licence for sales enablement.',
          'Any reuse of content requires written authorisation from Lucas Servais or SWEET NARCISSE SARL.'
        ]
      ]
    ] as const
  },
  de: {
    title: 'Datenschutzerklärung',
    update: (d: Date) => `Letzte Aktualisierung: ${d.toLocaleDateString('de-DE')}`,
    intro:
      'Diese Erklärung beschreibt, wie SWEET NARCISSE SARL personenbezogene Daten im Rahmen dieser Website-Demo erhebt, nutzt und schützt. Lucas Servais stellt eine Demonstrationslizenz bereit und behält bis zur endgültigen Übertragung sämtliche Urheberrechte.',
    sections: [
      [
        'Verantwortlicher',
        [
          'SWEET NARCISSE SARL, Pont Saint-Pierre, 68000 Colmar, Frankreich',
          'Kontakt: contact@sweet-narcisse.fr, +33 3 89 20 68 92'
        ]
      ],
      [
        'Erhobene Daten',
        [
          'Identitäts- und Kontaktdaten (Vorname, Nachname, E-Mail, Telefonnummer).',
          'Buchungsdaten (Reisedaten, Anzahl der Gäste, Präferenzen).',
          'Verlauf der Kundenkommunikation.',
          'Zahlungsdaten über Drittanbieter (Stripe, PayPal); es werden keine Kartendaten auf dieser Website gespeichert.'
        ]
      ],
      [
        'Zwecke',
        [
          'Verwaltung von Buchungsanfragen und Beherbergungsverträgen.',
          'Kundenservice und Nachbearbeitung.',
          'Erfüllung gesetzlicher und buchhalterischer Pflichten.',
          'Anonymisierte Analyse der Website-Performance zur Verbesserung der Nutzererfahrung.'
        ]
      ],
      [
        'Empfänger',
        [
          'Befugte Mitarbeitende von SWEET NARCISSE SARL.',
          'Technische Dienstleister und notwendige Drittanbieter-Tools (OVH Hosting, E-Mail-Dienste, Analytics).',
          'Zahlungsanbieter wie Stripe oder PayPal (Zahlungsdaten).',
          'Lucas Servais als Entwickler der Website, ausschließlich für technische Wartung im Rahmen der Demo-Vereinbarung.'
        ]
      ],
      [
        'Speicherdauer',
        [
          'Kundendaten: Dauer der Geschäftsbeziehung plus 5 Jahre (gesetzliche Aufbewahrungspflichten).',
          'Buchhaltungsunterlagen: 10 Jahre.',
          'Cookie-Daten: maximal 13 Monate.',
          'Technische Logs: maximal 12 Monate ausschließlich zu Sicherheits- und Wartungszwecken.'
        ]
      ],
      [
        'Rechte der betroffenen Personen',
        [
          'Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung und Datenübertragbarkeit.',
          'Widerruf der Einwilligung jederzeit, sofern die Verarbeitung auf Einwilligung beruht.',
          'Beschwerderecht bei der CNIL (www.cnil.fr).',
          'Zur Ausübung Ihrer Rechte wenden Sie sich an contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookies und Tracking',
        [
          'Einsatz beschränkt auf essenzielle technische Cookies, Zahlungsanbieter (Stripe, PayPal) und anonymisierte Analyse-Tools.',
          'Im Browser können Cookies blockiert werden; dies kann jedoch einzelne Funktionen einschränken.',
          'Keine Werbe- oder Profiling-Cookies in der Demo-Version.'
        ]
      ],
      [
        'Sicherheitsmaßnahmen',
        [
          'Technische und organisatorische Maßnahmen zum Schutz vor Verlust, Veränderung oder unbefugtem Zugriff.',
          'Zugriff nur für befugte Personen, die die Daten zur Aufgabenerfüllung benötigen.',
          'Regelmäßige Tests, Updates und Überwachung zur Minimierung von Schwachstellen.'
        ]
      ],
      [
        'Datenübermittlung außerhalb der EU',
        [
          'Die Daten werden überwiegend in der EU bei OVH gehostet.',
          'Bei Drittanbietern (z. B. E-Mail-Diensten, SaaS-Plattformen) mit Sitz außerhalb der EU werden Standardvertragsklauseln und gleichwertige Garantien angewendet.' 
        ]
      ],
      [
        'Urheberrecht & Demo-Lizenz',
        [
          'Alle Inhalte und Entwicklungen stammen von Lucas Servais, der bis zur endgültigen Übertragung die Urheberrechte behält.',
          'SWEET NARCISSE SARL nutzt die Website unter einer Demo-Lizenz zur Vertriebsunterstützung.',
          'Jegliche Weiterverwendung der Inhalte bedarf der schriftlichen Zustimmung von Lucas Servais oder SWEET NARCISSE SARL.'
        ]
      ]
    ] as const
  },
  es: {
    title: 'Política de Privacidad',
    update: (d: Date) => `Última actualización: ${d.toLocaleDateString('es-ES')}`,
    intro:
      'Esta política explica cómo SWEET NARCISSE SARL recopila, utiliza y protege los datos personales en el contexto de esta demostración del sitio. Lucas Servais otorga una licencia de demostración y conserva plenamente los derechos de propiedad intelectual hasta completar la transferencia comercial.',
    sections: [
      [
        'Responsable del tratamiento',
        [
          'SWEET NARCISSE SARL, Pont Saint-Pierre, 68000 Colmar, Francia',
          'Contacto: contact@sweet-narcisse.fr, +33 3 89 20 68 92'
        ]
      ],
      [
        'Datos recogidos',
        [
          'Datos de identidad y contacto (nombre, apellidos, email, teléfono).',
          'Información de reserva (fechas de estancia, número de huéspedes, preferencias).',
          'Historial de interacciones con el servicio de atención al cliente.',
          'Datos de pago tratados mediante proveedores externos (Stripe, PayPal); no almacenamos datos de tarjetas en este sitio.'
        ]
      ],
      [
        'Finalidades',
        [
          'Gestionar solicitudes de reserva y contratos de alojamiento.',
          'Gestionar la relación con el cliente (respuestas, seguimiento).',
          'Cumplir con obligaciones contables y legales.',
          'Analíticas anónimas para mejorar la experiencia de usuario.'
        ]
      ],
      [
        'Destinatarios',
        [
          'Personal autorizado de SWEET NARCISSE SARL.',
          'Proveedores técnicos y herramientas imprescindibles (hosting OVH, servicios de email, analítica).',
          'Proveedores de pago como Stripe o PayPal (datos de pago).',
          'Lucas Servais como diseñador del sitio, únicamente para mantenimiento técnico en el marco del acuerdo de demostración.'
        ]
      ],
      [
        'Plazos de conservación',
        [
          'Datos de clientes: duración de la relación contractual más 5 años (requisitos legales).',
          'Registros contables: 10 años.',
          'Datos de cookies: hasta 13 meses.',
          'Registros técnicos: hasta 12 meses, solo con fines de seguridad y mantenimiento.'
        ]
      ],
      [
        'Derechos de las personas',
        [
          'Acceso, rectificación, eliminación, oposición, limitación y portabilidad.',
          'Derecho a retirar el consentimiento en cualquier momento cuando el tratamiento se base en él.',
          'Derecho a presentar una reclamación ante la CNIL (www.cnil.fr).',
          'Para ejercer sus derechos: contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookies y rastreadores',
        [
          'Uso limitado a cookies técnicas esenciales, herramientas de pago (Stripe, PayPal) y analítica anonimada.',
          'Es posible configurar el navegador para rechazar cookies, aunque puede afectar ciertas funciones.',
          'No se emplean cookies publicitarias en esta versión de demostración.'
        ]
      ],
      [
        'Medidas de seguridad',
        [
          'Medidas técnicas y organizativas para proteger los datos frente a pérdida, alteración o acceso no autorizado.',
          'Acceso restringido únicamente al personal autorizado que necesita los datos para su labor.',
          'Pruebas, actualizaciones y monitorización periódicas para reducir vulnerabilidades.'
        ]
      ],
      [
        'Transferencias fuera de la UE',
        [
          'Los datos se alojan principalmente en la Unión Europea a través de OVH.',
          'Si determinadas herramientas (p. ej. servicios de email, plataformas SaaS) implican transferencias fuera de la UE, se aplican Cláusulas Contractuales Tipo y garantías equivalentes.' 
        ]
      ],
      [
        'Propiedad intelectual y licencia de demostración',
        [
          'Los contenidos y desarrollos del sitio han sido creados por Lucas Servais, quien mantiene la propiedad intelectual hasta la transferencia definitiva.',
          'SWEET NARCISSE SARL explota el sitio bajo licencia de demostración para apoyar la actividad comercial.',
          'Cualquier reutilización requiere autorización escrita de Lucas Servais o de SWEET NARCISSE SARL.'
        ]
      ]
    ] as const
  },
  it: {
    title: 'Informativa sulla Privacy',
    update: (d: Date) => `Ultimo aggiornamento: ${d.toLocaleDateString('it-IT')}`,
    intro:
      "La presente informativa descrive come SWEET NARCISSE SARL raccoglie, utilizza e protegge i dati personali nell'ambito di questa demo del sito. Lucas Servais concede una licenza dimostrativa e conserva integralmente i diritti di proprietà intellettuale fino al completamento del trasferimento commerciale.",
    sections: [
      [
        'Titolare del trattamento',
        [
          'SWEET NARCISSE SARL, Pont Saint-Pierre, 68000 Colmar, Francia',
          'Contatto: contact@sweet-narcisse.fr, +33 3 89 20 68 92'
        ]
      ],
      [
        'Dati raccolti',
        [
          'Dati identificativi e di contatto (nome, cognome, email, telefono).',
          'Informazioni sulla prenotazione (date del soggiorno, numero di ospiti, preferenze).',
          'Cronologia delle comunicazioni con l’assistenza clienti.',
          'Dati di pagamento elaborati da fornitori terzi (Stripe, PayPal); il sito non memorizza dati delle carte.'
        ]
      ],
      [
        'Finalità del trattamento',
        [
          'Gestione delle richieste di prenotazione e dei contratti di soggiorno.',
          'Gestione della relazione con i clienti (risposte, follow-up).',
          'Adempimenti contabili e obblighi di legge.',
          'Analisi anonime delle performance del sito per migliorare l’esperienza utente.'
        ]
      ],
      [
        'Destinatari',
        [
          'Personale autorizzato di SWEET NARCISSE SARL.',
          'Fornitori tecnici e strumenti indispensabili (hosting OVH, servizi email, analytics).',
          'Prestatori di pagamento come Stripe o PayPal (dati di pagamento).',
          'Lucas Servais, in qualità di ideatore del sito, esclusivamente per manutenzione tecnica nel quadro dell’accordo di demo.'
        ]
      ],
      [
        'Tempi di conservazione',
        [
          'Dati dei clienti: durata del rapporto contrattuale più 5 anni (obblighi di legge).',
          'Documentazione contabile: 10 anni.',
          'Dati dei cookie: fino a 13 mesi.',
          'Log tecnici: fino a 12 mesi, utilizzati solo per sicurezza e manutenzione.'
        ]
      ],
      [
        'Diritti degli interessati',
        [
          'Accesso, rettifica, cancellazione, opposizione, limitazione e portabilità.',
          'Diritto di revocare il consenso in qualsiasi momento qualora il trattamento si basi su di esso.',
          'Diritto di proporre reclamo alla CNIL (www.cnil.fr).',
          'Per esercitare i diritti: contact@sweet-narcisse.fr.'
        ]
      ],
      [
        'Cookie e tracciatori',
        [
          'Uso limitato a cookie tecnici essenziali, strumenti di pagamento (Stripe, PayPal) e analytics anonimizzati.',
          'È possibile configurare il browser per rifiutare i cookie, con possibile impatto su alcune funzionalità.',
          'Nessun cookie pubblicitario viene impiegato nella versione dimostrativa.'
        ]
      ],
      [
        'Sicurezza',
        [
          'Misure tecniche e organizzative per proteggere i dati da perdita, alterazione o accessi non autorizzati.',
          'Accesso limitato esclusivamente al personale autorizzato che necessita dei dati per svolgere le proprie mansioni.',
          'Test, aggiornamenti e monitoraggi periodici per ridurre le vulnerabilità.'
        ]
      ],
      [
        "Trasferimenti di dati fuori dall'UE",
        [
          'I dati sono principalmente ospitati nell’Unione Europea tramite OVH.',
          "Qualora alcuni fornitori (es. servizi email, piattaforme SaaS) comportino trasferimenti fuori dall'UE, vengono adottate Clausole Contrattuali Standard e garanzie equivalenti." 
        ]
      ],
      [
        'Proprietà intellettuale e licenza demo',
        [
          'I contenuti e gli sviluppi del sito sono realizzati da Lucas Servais, che conserva la proprietà intellettuale fino alla cessione definitiva.',
          "SWEET NARCISSE SARL utilizza il sito con licenza dimostrativa per supportare la vendita.",
          'Qualsiasi riutilizzo dei contenuti richiede l’autorizzazione scritta di Lucas Servais o di SWEET NARCISSE SARL.'
        ]
      ]
    ] as const
  }
} satisfies Record<Lang, PrivacyContent>

export default async function PrivacyPage({ params }: { params: Promise<{ lang?: string }> }) {
  const resolved = await params
  const rawLang = resolved?.lang ?? 'fr'
  const lang = SUPPORTED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : 'fr'
  const content = privacy[lang]
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
          <h1 className="mt-6 text-4xl font-serif font-bold text-white">{content.title}</h1>
          <p className="mt-3 text-sm text-slate-300">{content.update(now)}</p>
        </header>
        <article className="sn-card bg-white/95 border border-white/40 px-6 py-6 shadow-xl backdrop-blur mb-6">
          <p className="text-sm leading-relaxed text-slate-600">{content.intro}</p>
        </article>
        <div className="space-y-6">
          {content.sections.map(([title, paragraphs], idx) => (
            <section
              key={idx}
              className="sn-card bg-white/95 border border-white/40 px-6 py-6 shadow-xl backdrop-blur"
            >
              <h2 className="text-xl font-semibold text-[#0f172a] mb-3">{title}</h2>
              <div className="space-y-2 text-sm leading-relaxed text-slate-600">
                {paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
