/**
 * Email dictionaries for internationalized email templates
 * Supports: fr, en, de, es, it
 */

export type EmailLang = 'fr' | 'en' | 'de' | 'es' | 'it'

export const emailDictionaries = {
  // ===== BookingTemplate =====
  booking: {
    confirmationTitle: {
      fr: 'Confirmation de votre balade',
      en: 'Booking Confirmation',
      de: 'Buchungsbestätigung',
      es: 'Confirmación de su paseo',
      it: 'Conferma della prenotazione'
    },
    hello: {
      fr: (name: string) => `Bonjour ${name},`,
      en: (name: string) => `Hello ${name},`,
      de: (name: string) => `Hallo ${name},`,
      es: (name: string) => `Hola ${name},`,
      it: (name: string) => `Ciao ${name},`
    },
    welcomeMessage: {
      fr: 'Nous avons hâte de vous accueillir à bord. Voici un récapitulatif de votre réservation.',
      en: 'We look forward to welcoming you aboard. Here is a summary of your booking.',
      de: 'Wir freuen uns, Sie an Bord begrüßen zu dürfen. Hier ist eine Zusammenfassung Ihrer Buchung.',
      es: 'Estamos deseando darle la bienvenida a bordo. Aquí tiene un resumen de su reserva.',
      it: "Non vediamo l'ora di accogliervi a bordo. Ecco un riepilogo della vostra prenotazione."
    },
    tripDetails: {
      fr: 'Détails de la sortie',
      en: 'Trip Details',
      de: 'Fahrtdetails',
      es: 'Detalles del paseo',
      it: 'Dettagli del viaggio'
    },
    passengers: {
      fr: (n: number) => `${n} passagers`,
      en: (n: number) => `${n} passengers`,
      de: (n: number) => `${n} Passagiere`,
      es: (n: number) => `${n} pasajeros`,
      it: (n: number) => `${n} passeggeri`
    },
    breakdown: {
      fr: 'Répartition',
      en: 'Breakdown',
      de: 'Aufschlüsselung',
      es: 'Desglose',
      it: 'Dettaglio'
    },
    adults: {
      fr: (n: number) => `${n} adulte${n > 1 ? 's' : ''}`,
      en: (n: number) => `${n} adult${n > 1 ? 's' : ''}`,
      de: (n: number) => `${n} Erwachsene${n > 1 ? '' : 'r'}`,
      es: (n: number) => `${n} adulto${n > 1 ? 's' : ''}`,
      it: (n: number) => `${n} adult${n > 1 ? 'i' : 'o'}`
    },
    children: {
      fr: (n: number) => `${n} enfant${n > 1 ? 's' : ''}`,
      en: (n: number) => `${n} child${n > 1 ? 'ren' : ''}`,
      de: (n: number) => `${n} Kind${n > 1 ? 'er' : ''}`,
      es: (n: number) => `${n} niño${n > 1 ? 's' : ''}`,
      it: (n: number) => `${n} bambin${n > 1 ? 'i' : 'o'}`
    },
    babies: {
      fr: (n: number) => `${n} bébé${n > 1 ? 's' : ''}`,
      en: (n: number) => `${n} bab${n > 1 ? 'ies' : 'y'}`,
      de: (n: number) => `${n} Baby${n > 1 ? 's' : ''}`,
      es: (n: number) => `${n} bebé${n > 1 ? 's' : ''}`,
      it: (n: number) => `${n} neonat${n > 1 ? 'i' : 'o'}`
    },
    reference: {
      fr: 'Référence',
      en: 'Reference',
      de: 'Referenz',
      es: 'Referencia',
      it: 'Riferimento'
    },
    qrCodePresent: {
      fr: "Présentez ce QR Code à l'embarquement",
      en: 'Show this QR Code at boarding',
      de: 'Zeigen Sie diesen QR-Code beim Einsteigen',
      es: 'Presente este código QR al embarcar',
      it: "Mostri questo codice QR all'imbarco"
    },
    qrCodeFallback: {
      fr: "Si l'image ne s'affiche pas, conservez ce mail : l'équipage pourra retrouver votre réservation grâce à la référence.",
      en: "If the image doesn't display, keep this email: the crew can find your booking using the reference.",
      de: 'Falls das Bild nicht angezeigt wird, bewahren Sie diese E-Mail auf: Die Crew kann Ihre Buchung anhand der Referenz finden.',
      es: 'Si la imagen no se muestra, conserve este correo: la tripulación podrá encontrar su reserva con la referencia.',
      it: "Se l'immagine non viene visualizzata, conservi questa email: l'equipaggio potrà trovare la prenotazione con il riferimento."
    },
    cruiseAmount: {
      fr: 'Montant de votre croisière',
      en: 'Your cruise amount',
      de: 'Betrag Ihrer Fahrt',
      es: 'Importe de su crucero',
      it: 'Importo della crociera'
    },
    invoiceNote: {
      fr: 'Le détail complet du tarif est disponible dans la facture PDF jointe à ce message. Conservez-la pour votre comptabilité.',
      en: 'The complete price breakdown is available in the PDF invoice attached to this email. Keep it for your records.',
      de: 'Die vollständige Preisaufschlüsselung finden Sie in der beigefügten PDF-Rechnung. Bewahren Sie sie für Ihre Unterlagen auf.',
      es: 'El desglose completo del precio está disponible en la factura PDF adjunta. Consérvela para su contabilidad.',
      it: 'Il dettaglio completo del prezzo è disponibile nella fattura PDF allegata. Conservatela per la contabilità.'
    },
    importantBefore: {
      fr: 'Important avant votre arrivée',
      en: 'Important before your arrival',
      de: 'Wichtig vor Ihrer Ankunft',
      es: 'Importante antes de su llegada',
      it: 'Importante prima del vostro arrivo'
    },
    arriveEarly: {
      fr: "Merci de vous présenter au ponton 10 minutes avant l'heure de départ afin de faciliter l'embarquement.",
      en: 'Please arrive at the pier 10 minutes before departure time to facilitate boarding.',
      de: 'Bitte kommen Sie 10 Minuten vor der Abfahrtszeit am Steg an, um das Einsteigen zu erleichtern.',
      es: 'Por favor, llegue al embarcadero 10 minutos antes de la hora de salida para facilitar el embarque.',
      it: "Si prega di presentarsi al pontile 10 minuti prima della partenza per facilitare l'imbarco."
    },
    boardingPoint: {
      fr: "Point d'embarquement : Pont Saint-Pierre, 10 Rue de la Herse, 68000 Colmar.",
      en: 'Boarding point: Pont Saint-Pierre, 10 Rue de la Herse, 68000 Colmar.',
      de: 'Einstiegspunkt: Pont Saint-Pierre, 10 Rue de la Herse, 68000 Colmar.',
      es: 'Punto de embarque: Pont Saint-Pierre, 10 Rue de la Herse, 68000 Colmar.',
      it: 'Punto di imbarco: Pont Saint-Pierre, 10 Rue de la Herse, 68000 Colmar.'
    },
    viewRoute: {
      fr: "Consultez l'itinéraire :",
      en: 'View the route:',
      de: 'Route anzeigen:',
      es: 'Consulte el itinerario:',
      it: "Consulta l'itinerario:"
    },
    openMaps: {
      fr: 'Ouvrir dans Google Maps',
      en: 'Open in Google Maps',
      de: 'In Google Maps öffnen',
      es: 'Abrir en Google Maps',
      it: 'Apri in Google Maps'
    },
    mapFallback: {
      fr: "Si l'ouverture échoue, copiez-collez ce lien dans votre navigateur :",
      en: "If the link doesn't work, copy and paste this URL in your browser:",
      de: 'Falls der Link nicht funktioniert, kopieren Sie diese URL in Ihren Browser:',
      es: 'Si el enlace no funciona, copie y pegue esta URL en su navegador:',
      it: 'Se il link non funziona, copia e incolla questo URL nel browser:'
    },
    reviewMatters: {
      fr: 'Votre avis compte',
      en: 'Your review matters',
      de: 'Ihre Bewertung zählt',
      es: 'Su opinión cuenta',
      it: 'La vostra opinione conta'
    },
    reviewHelp: {
      fr: "Partagez votre expérience à bord pour aider les prochains voyageurs et soutenir l'équipage.",
      en: 'Share your experience to help future travelers and support the crew.',
      de: 'Teilen Sie Ihre Erfahrung, um anderen Reisenden zu helfen und die Crew zu unterstützen.',
      es: 'Comparta su experiencia para ayudar a futuros viajeros y apoyar a la tripulación.',
      it: "Condividete la vostra esperienza per aiutare i futuri viaggiatori e sostenere l'equipaggio."
    },
    leaveGoogleReview: {
      fr: 'Laisser un avis Google',
      en: 'Leave a Google Review',
      de: 'Google-Bewertung hinterlassen',
      es: 'Dejar una reseña en Google',
      it: 'Lascia una recensione su Google'
    },
    needToCancel: {
      fr: "Besoin de modifier ou d'annuler ?",
      en: 'Need to modify or cancel?',
      de: 'Änderung oder Stornierung nötig?',
      es: '¿Necesita modificar o cancelar?',
      it: 'Bisogno di modificare o annullare?'
    },
    manageBooking: {
      fr: 'Gérer ma réservation',
      en: 'Manage My Booking',
      de: 'Meine Buchung verwalten',
      es: 'Gestionar mi reserva',
      it: 'Gestisci la prenotazione'
    },
    cancelPolicyShort: {
      fr: 'Politique : >48h = 100% - 48-24h = 50% - <24h/no-show = 0%. Alerte météo orange/rouge : remboursement intégral.',
      en: 'Policy: >48h = 100% - 48-24h = 50% - <24h/no-show = 0%. Orange/red weather alert: full refund.',
      de: 'Richtlinie: >48h = 100% - 48-24h = 50% - <24h/No-Show = 0%. Wetterwarnung Orange/Rot: vollständige Erstattung.',
      es: 'Política: >48h = 100% - 48-24h = 50% - <24h/no-show = 0%. Alerta meteorológica naranja/roja: reembolso total.',
      it: 'Politica: >48h = 100% - 48-24h = 50% - <24h/no-show = 0%. Allerta meteo arancione/rossa: rimborso totale.'
    }
  },

  // ===== ReviewRequestTemplate =====
  review: {
    serviceTitle: {
      fr: 'Service Experience Client',
      en: 'Customer Experience Service',
      de: 'Kundenservice',
      es: 'Servicio de Experiencia Cliente',
      it: 'Servizio Esperienza Cliente'
    },
    hello: {
      fr: (name: string) => `Bonjour ${name},`,
      en: (name: string) => `Hello ${name},`,
      de: (name: string) => `Hallo ${name},`,
      es: (name: string) => `Hola ${name},`,
      it: (name: string) => `Ciao ${name},`
    },
    thankYou: {
      fr: (date: string) => `Merci d'avoir navigué avec nous le ${date}. Votre retour nous aide à faire vivre des moments encore plus mémorables à bord.`,
      en: (date: string) => `Thank you for sailing with us on ${date}. Your feedback helps us create even more memorable moments on board.`,
      de: (date: string) => `Vielen Dank, dass Sie am ${date} mit uns gefahren sind. Ihr Feedback hilft uns, noch unvergesslichere Momente an Bord zu schaffen.`,
      es: (date: string) => `Gracias por navegar con nosotros el ${date}. Sus comentarios nos ayudan a crear momentos aún más memorables a bordo.`,
      it: (date: string) => `Grazie per aver navigato con noi il ${date}. Il vostro feedback ci aiuta a creare momenti ancora più memorabili a bordo.`
    },
    askReview: {
      fr: 'Auriez-vous 1 minute pour partager votre expérience ?',
      en: 'Would you have 1 minute to share your experience?',
      de: 'Hätten Sie 1 Minute Zeit, Ihre Erfahrung zu teilen?',
      es: '¿Tendría 1 minuto para compartir su experiencia?',
      it: 'Avreste 1 minuto per condividere la vostra esperienza?'
    },
    googleButton: {
      fr: 'Donner mon avis sur Google',
      en: 'Leave a Google Review',
      de: 'Google-Bewertung abgeben',
      es: 'Dejar una reseña en Google',
      it: 'Lascia una recensione su Google'
    },
    orTripadvisor: {
      fr: 'Ou bien sur',
      en: 'Or on',
      de: 'Oder auf',
      es: 'O en',
      it: 'Oppure su'
    },
    whyMattersTitle: {
      fr: 'Pourquoi votre avis compte :',
      en: 'Why your review matters:',
      de: 'Warum Ihre Bewertung wichtig ist:',
      es: 'Por qué importa su opinión:',
      it: 'Perché la vostra opinione conta:'
    },
    whyMattersPoint1: {
      fr: 'Il guide les voyageurs qui cherchent une balade douce sur la Lauch.',
      en: 'It helps travelers looking for a peaceful ride on the Lauch.',
      de: 'Sie hilft Reisenden, die eine ruhige Fahrt auf der Lauch suchen.',
      es: 'Ayuda a los viajeros que buscan un paseo tranquilo por el Lauch.',
      it: 'Aiuta i viaggiatori alla ricerca di un giro tranquillo sulla Lauch.'
    },
    whyMattersPoint2: {
      fr: "Il nous permet de célébrer l'équipe qui était à vos côtés.",
      en: 'It allows us to celebrate the team that was with you.',
      de: 'Sie ermöglicht es uns, das Team zu würdigen, das bei Ihnen war.',
      es: 'Nos permite celebrar al equipo que estuvo con usted.',
      it: 'Ci permette di celebrare il team che vi ha accompagnato.'
    },
    whyMattersPoint3: {
      fr: 'Il nous indique comment rendre la prochaine sortie encore meilleure.',
      en: 'It shows us how to make the next trip even better.',
      de: 'Sie zeigt uns, wie wir die nächste Fahrt noch besser machen können.',
      es: 'Nos indica cómo mejorar el próximo paseo.',
      it: 'Ci indica come rendere la prossima uscita ancora migliore.'
    },
    closing: {
      fr: 'Chaleureusement,',
      en: 'Warmly,',
      de: 'Herzlich,',
      es: 'Cordialmente,',
      it: 'Cordialmente,'
    },
    team: {
      fr: "L'équipe Sweet Narcisse",
      en: 'Sweet Narcisse Team',
      de: 'Sweet Narcisse Team',
      es: 'Equipo Sweet Narcisse',
      it: 'Team Sweet Narcisse'
    }
  }
} as const

/**
 * Helper to get translated string or function
 */
export function getEmailText(
  template: 'booking' | 'review',
  key: string,
  lang: EmailLang = 'fr'
): unknown {
  const dict = emailDictionaries[template] as Record<string, Record<EmailLang, unknown>>
  return dict[key]?.[lang]
}
