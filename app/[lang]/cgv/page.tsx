export const dynamic = 'force-dynamic'
export const revalidate = 0

const content = {
  fr: {
    title: 'Conditions Générales de Vente',
    update: (d: Date) => `Dernière mise à jour: ${d.toLocaleDateString('fr-FR')}`,
    sections: [
      ['Objet et prestations', `La prestation consiste en une promenade guidée d’environ 25 minutes au départ du Pont Saint‑Pierre, selon les créneaux affichés et sous réserve des conditions météorologiques et opérationnelles.`],
      ['Réservation', [
        `La réservation s’effectue en ligne, avec indication du nombre de personnes et de la langue souhaitée.`,
        `Les réservations avec paiement en ligne sont créées en statut « PENDING » puis confirmées après paiement réussi.`,
        `Un e‑mail de confirmation est envoyé pour toute réservation confirmée et payée.`,
      ]],
      ['Tarifs et Paiement', [
        `Tarifs TTC (adulte, enfant, bébé).`,
        `Paiement en ligne (carte Stripe, Apple/Google Pay, PayPal) ou sur place (selon disponibilité).`,
        `La réservation est confirmée à réception de l’autorisation de paiement.`,
      ]],
      ['Droit de rétractation', `Conformément à l’article L.221‑28 (activités de loisirs datées), le droit de rétractation ne s’applique pas. Voir conditions d’annulation ci‑dessous.`],
      ['Annulation par le client', [
        `Plus de 48h avant: remboursement intégral.`,
        `Entre 48h et 24h: remboursement de 50%.`,
        `Moins de 24h avant ou no‑show: pas de remboursement.`,
        `Modification d’horaire: sans frais si disponibilité (au plus tard 24h avant).`,
      ]],
      ["Annulation / interruption par l’exploitant", [
        `Météo, niveau d’eau, sécurité ou force majeure: la sortie peut être annulée.`,
        `Annulation avant départ: remboursement intégral.`,
        `Interruption après départ: remboursement au prorata ou avoir.`,
        `En cas de vigilance météo orange/rouge ou conditions empêchant l’exploitation: remboursement intégral quel que soit le délai.`,
      ]],
      ['Retard', `Tout retard peut entraîner la perte du créneau sans remboursement.`],
      ['Responsabilité et sécurité', [
        `Enfants sous la responsabilité des accompagnants.`,
        `Respectez les consignes du personnel à bord.`,
        `Aucune responsabilité pour objets perdus/détériorés.`,
      ]],
      ['Données personnelles', `Données utilisées pour la gestion des réservations et la relation client; droits d’accès et de rectification respectés.`],
      ['Litiges et droit applicable', `Droit français, tentative amiable avant toute action.`],
      ['Politique de remboursement', [
        `Selon barème d’annulation ou annulation par l’exploitant.`,
        `Remboursement sur le moyen de paiement d’origine (Stripe/PayPal/Apple/Google Pay).`,
        `Délai indicatif: 5–10 jours ouvrés après validation.`,
      ]],
    ]
  },
  en: {
    title: 'Terms and Conditions',
    update: (d: Date) => `Last updated: ${d.toLocaleDateString('en-GB')}`,
    sections: [
      ['Scope and Services', `Approx. 25‑minute guided boat ride from Pont Saint‑Pierre, subject to schedule, weather and operational conditions.`],
      ['Booking', [
        `Online booking with party size and language.`,
        `Online‑paid bookings are created as PENDING, then confirmed after successful payment.`,
        `A confirmation email is sent for confirmed and paid bookings.`,
      ]],
      ['Prices and Payment', [
        `VAT‑inclusive prices (adult, child, baby).`,
        `Online payment (Stripe card, Apple/Google Pay, PayPal) or on site when available.`,
        `Booking is confirmed once payment authorization is received.`,
      ]],
      ['Right of withdrawal', `Not applicable for dated leisure services (EU consumer law). See cancellation policy below.`],
      ['Cancellation by customer', [
        `More than 48h: full refund.`,
        `48–24h: 50% refund.`,
        `Less than 24h or no‑show: no refund.`,
        `Timeslot change: free if available (at least 24h prior).`,
      ]],
      ['Cancellation/interruption by operator', [
        `Weather/safety/force majeure: trip may be cancelled.`,
        `Before departure: full refund.`,
        `After departure: pro‑rata refund or credit.`,
        `If severe weather alerts (orange/red) or conditions prevent operation: full refund regardless of notice.`,
      ]],
      ['Delay', `Late arrival may forfeit the timeslot without refund.`],
      ['Liability and safety', [
        `Children under guardians’ responsibility.`,
        `Follow crew instructions on board.`,
        `No liability for lost/damaged items.`,
      ]],
      ['Personal data', `Data used for booking/billing/customer care; data subject rights respected.`],
      ['Disputes and law', `French law; amicable resolution sought first.`],
      ['Refund policy', [
        `Per cancellation scale or operator cancellation.`,
        `Refund to the original payment method (Stripe/PayPal/Apple/Google Pay).`,
        `Indicative delay: 5–10 business days after approval.`,
      ]],
    ]
  },
  de: {
    title: 'Allgemeine Geschäftsbedingungen',
    update: (d: Date) => `Letzte Aktualisierung: ${d.toLocaleDateString('de-DE')}`,
    sections: [
      ['Leistungsumfang', `Geführte Bootsfahrt von ca. 25 Minuten ab Pont Saint‑Pierre; abhängig von Zeitplan, Wetter und Betrieb.`],
      ['Buchung', [
        `Online‑Buchung mit Personenzahl und Sprache.`,
        `Online bezahlte Buchungen werden als PENDING angelegt und nach erfolgreicher Zahlung bestätigt.`,
        `Bestätigungs‑E‑Mail für bestätigte und bezahlte Buchungen.`,
      ]],
      ['Preise und Zahlung', [
        `Preise inkl. MwSt. (Erwachsene, Kinder, Baby).`,
        `Online‑Zahlung (Stripe Karte, Apple/Google Pay, PayPal) oder vor Ort, sofern verfügbar.`,
        `Bestätigung nach Zahlungsauthorisierung.`,
      ]],
      ['Widerrufsrecht', `Nicht anwendbar bei datumsgebundenen Freizeitleistungen. Siehe Stornobedingungen unten.`],
      ['Stornierung durch Kunden', [
        `Mehr als 48 Std.: volle Erstattung.`,
        `48–24 Std.: 50% Erstattung.`,
        `Unter 24 Std. oder Nichterscheinen: keine Erstattung.`,
        `Slot‑Änderung: kostenlos bei Verfügbarkeit (spätestens 24 Std. vorher).`,
      ]],
      ['Stornierung/Abbruch durch Betreiber', [
        `Wetter/Sicherheit/Höhere Gewalt: Fahrt kann ausfallen.`,
        `Vor Abfahrt: volle Erstattung.`,
        `Nach Abfahrt: anteilige Erstattung oder Gutschrift.`,
        `Bei Unwetterwarnungen (Orange/Rot) oder Unmöglichkeit des Betriebs: volle Erstattung unabhängig von der Frist.`,
      ]],
      ['Verspätung', `Bei Verspätung kann der Slot verfallen; keine Erstattung.`],
      ['Haftung und Sicherheit', [
        `Kinder unter Aufsicht der Begleitpersonen.`,
        `Anweisungen der Crew befolgen.`,
        `Keine Haftung für Verlust/Beschädigung von Gegenständen.`,
      ]],
      ['Personenbezogene Daten', `Daten für Buchung/Abrechnung/Kundenservice; Betroffenenrechte werden gewahrt.`],
      ['Streitfälle und Recht', `Französisches Recht; gütliche Einigung vorrangig.`],
      ['Erstattungsrichtlinie', [
        `Gemäß Stornoskala oder Betreiberstornierung.`,
        `Rückerstattung auf die ursprüngliche Zahlungsart (Stripe/PayPal/Apple/Google Pay).`,
        `Richtwert: 5–10 Werktage nach Bestätigung.`,
      ]],
    ]
  },
  es: {
    title: 'Condiciones Generales de Venta',
    update: (d: Date) => `Última actualización: ${d.toLocaleDateString('es-ES')}`,
    sections: [
      ['Objeto y Servicios', `Paseo guiado en barca de ~25 minutos desde el Pont Saint‑Pierre, sujeto a horario, meteorología y operación.`],
      ['Reserva', [
        `Reserva online con número de personas e idioma.`,
        `Las reservas con pago online se crean en estado PENDING y se confirman tras el pago exitoso.`,
        `Se envía un e‑mail de confirmación para reservas confirmadas y pagadas.`,
      ]],
      ['Precios y Pago', [
        `Precios con IVA (adulto, niño, bebé).`,
        `Pago online (tarjeta Stripe, Apple/Google Pay, PayPal) o en sitio según disponibilidad.`,
        `Confirmación al recibir la autorización de pago.`,
      ]],
      ['Derecho de desistimiento', `No aplicable a servicios de ocio con fecha. Ver política de cancelación.`],
      ['Cancelación por el cliente', [
        `Más de 48 h: reembolso total.`,
        `48–24 h: reembolso del 50%.`,
        `Menos de 24 h o no presentación: sin reembolso.`,
        `Cambio de horario: sin coste si hay disponibilidad (hasta 24 h antes).`,
      ]],
      ['Cancelación/interrupción por el operador', [
        `Meteorología/seguridad/fuerza mayor: posible cancelación.`,
        `Antes de la salida: reembolso total.`,
        `Tras la salida: reembolso proporcional o vale.`,
        `Si hay alertas meteorológicas severas (naranja/roja) o imposibilidad de operar: reembolso total sin importar el plazo.`,
      ]],
      ['Retraso', `Un retraso puede implicar pérdida del horario sin reembolso.`],
      ['Responsabilidad y seguridad', [
        `Los niños quedan bajo responsabilidad de los acompañantes.`,
        `Siga las instrucciones de la tripulación.`,
        `Sin responsabilidad por objetos perdidos/dañados.`,
      ]],
      ['Datos personales', `Datos usados para reserva/facturación/atención; derechos del interesado respetados.`],
      ['Litigios y ley', `Ley francesa; se prioriza solución amistosa.`],
      ['Política de reembolso', [
        `Según escala de cancelación o cancelación del operador.`,
        `Reembolso al método de pago original (Stripe/PayPal/Apple/Google Pay).`,
        `Plazo indicativo: 5–10 días hábiles tras la validación.`,
      ]],
    ]
  },
  it: {
    title: 'Condizioni Generali di Vendita',
    update: (d: Date) => `Ultimo aggiornamento: ${d.toLocaleDateString('it-IT')}`,
    sections: [
      ['Oggetto e Servizi', `Giro in barca guidato di ~25 minuti dal Pont Saint‑Pierre, soggetto a orari, meteo e operatività.`],
      ['Prenotazione', [
        `Prenotazione online con numero di persone e lingua.`,
        `Le prenotazioni con pagamento online sono create come PENDING e confermate dopo il pagamento riuscito.`,
        `E‑mail di conferma per prenotazioni confermate e pagate.`,
      ]],
      ['Prezzi e Pagamento', [
        `Prezzi IVA inclusa (adulto, bambino, neonato).`,
        `Pagamento online (carta Stripe, Apple/Google Pay, PayPal) o in loco se disponibile.`,
        `Conferma al ricevimento dell'autorizzazione di pagamento.`,
      ]],
      ['Diritto di recesso', `Non applicabile ai servizi di svago datati. Vedere le condizioni di annullamento.`],
      ['Annullamento da parte del cliente', [
        `Oltre 48 h: rimborso totale.`,
        `48–24 h: rimborso del 50%.`,
        `Meno di 24 h o no‑show: nessun rimborso.`,
        `Cambio fascia oraria: gratuito se disponibile (almeno 24 h prima).`,
      ]],
      ["Annullamento/interruzione dell’operatore", [
        `Meteo/sicurezza/forza maggiore: possibile annullamento.`,
        `Prima della partenza: rimborso totale.`,
        `Dopo la partenza: rimborso proporzionale o credito.`,
        `In caso di allerte meteo severe (arancione/rosso) o impossibilità operativa: rimborso totale indipendentemente dal preavviso.`,
      ]],
      ['Ritardo', `Il ritardo può comportare la perdita della fascia oraria senza rimborso.`],
      ['Responsabilità e sicurezza', [
        `Bambini sotto la responsabilità degli accompagnatori.`,
        `Seguire le istruzioni dell'equipaggio.`,
        `Nessuna responsabilità per oggetti persi/danneggiati.`,
      ]],
      ['Dati personali', `Dati usati per prenotazioni/fatturazione/assistenza; sono rispettati i diritti degli interessati.`],
      ['Controversie e legge', `Diritto francese; priorità alla soluzione amichevole.`],
      ['Politica di rimborso', [
        `Secondo la scala di annullamento o annullamento dell’operatore.`,
        `Rimborso sul metodo di pagamento originale (Stripe/PayPal/Apple/Google Pay).`,
        `Tempi indicativi: 5–10 giorni lavorativi dopo l’approvazione.`,
      ]],
    ]
  },
} as const

export default function CGVPage({ params }: { params: { lang: keyof typeof content } }) {
  const lang = (['fr','en','de','es','it'] as const).includes(params.lang as any) ? params.lang : 'fr'
  const c = content[lang]
  const now = new Date()
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
      <div className="not-prose mb-6 flex items-center gap-3">
        <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-10 w-auto" />
        <h1 className="m-0">{c.title}</h1>
      </div>
      {c.sections.map((sec, idx) => (
        <section key={idx}>
          <h2>{sec[0]}</h2>
          {Array.isArray(sec[1]) ? (
            <ul>
              {(sec[1] as string[]).map((li, i) => (<li key={i}>{li}</li>))}
            </ul>
          ) : (
            <p>{sec[1] as string}</p>
          )}
        </section>
      ))}
      <p className="text-sm text-slate-500">{c.update(now)}</p>
    </main>
  )
}
