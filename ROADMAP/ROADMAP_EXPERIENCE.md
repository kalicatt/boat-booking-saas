Roadmap Automation : Collecte d'Avis (Post-Visite)
Ce document détaille l'implémentation d'un système d'envoi automatique d'emails de demande d'avis (Google / TripAdvisor) le lendemain de la visite, envoyés depuis l'adresse dédiée experience@sweet-narcisse.fr.

Objectif Business : Augmenter le volume d'avis positifs en sollicitant les clients à J+1 via un canal dédié "Expérience Client", distinct des emails transactionnels.

🗄️ Phase 1 : Base de Données (Suivi)
Objectif : Garantir l'unicité de l'envoi pour éviter de solliciter plusieurs fois le même client.

1. Mise à jour du Schéma Prisma
Ajout d'un marqueur pour suivre l'état de l'envoi de l'email d'avis.

Fichier : prisma/schema.prisma

Action : Ajouter le champ boolean reviewMailSent au modèle Booking.

Extrait de code

model Booking {
  // ... champs existants (id, createdAt, date, etc.)
  isPaid          Boolean         @default(true)
  
  // --- SUIVI AVIS ---
  reviewMailSent  Boolean         @default(false) 

  // ... relations
}
Commande de migration :

Bash

npx prisma migrate dev --name add_review_mail_tracking
📧 Phase 2 : Identité & Configuration Email
Objectif : Configurer l'expéditeur spécifique experience@ pour humaniser la relation.

1. Déclaration de l'Identité
Mise à jour de la configuration centrale des emails pour inclure le nouveau rôle.

Fichier : lib/emailAddresses.ts

Code à modifier :

TypeScript

// Récupération de l'adresse (avec fallback)
const contact = (process.env.EMAIL_CONTACT || 'contact@sweet-narcisse.fr').trim()
// AJOUT :
const experience = (process.env.EMAIL_EXPERIENCE || 'experience@sweet-narcisse.fr').trim()

export const EMAIL_ROLES = {
  contact,
  reservations,
  billing,
  notifications,
  experience, // <--- Nouveau rôle
} as const

export const EMAIL_FROM = {
  contact: formatAddress(contact),
  reservations: formatAddress(reservations),
  billing: formatAddress(billing),
  notifications: formatAddress(notifications),
  // AJOUT : Nom d'expéditeur personnalisé
  experience: formatAddress(experience, 'L\'équipe Sweet Narcisse'), 
} as const
2. Variables d'Environnement
Fichier : .env (et configuration VPS)

Variables à ajouter :

Bash

# Configuration Email
EMAIL_EXPERIENCE="experience@sweet-narcisse.fr"

# Liens directs vers les formulaires d'avis
NEXT_PUBLIC_GOOGLE_REVIEW_URL="https://g.page/r/YOUR_GOOGLE_ID/review"
NEXT_PUBLIC_TRIPADVISOR_REVIEW_URL="https://www.tripadvisor.fr/UserReview-..."
3. Template Email (React Email)
Création du template visuel.

Fichier : components/emails/ReviewRequestTemplate.tsx (Nouveau)

Structure :

Sujet : "Votre balade en barque : qu'en avez-vous pensé ? 🛶"

Header : Logo.

Contenu : "Bonjour [Prénom], nous espérons que vous avez passé un moment magique..."

CTA Principal : Bouton "Partager mon expérience sur Google".

Footer : "Envoyé par le service Expérience Client".

⚙️ Phase 3 : Logique Backend (API Batch)
Objectif : Créer une "Cron Task" exposée via API pour traiter les envois en masse.

1. Route API de Traitement
Cette route sera appelée quotidiennement par le script de maintenance.

Fichier : app/api/cron/send-reviews/route.ts (Nouveau)

Logique technique :

Calcul de date : Cibler la journée de la veille (yesterday).

Requête Prisma : Sélectionner les réservations qui respectent tous ces critères :

date = hier.

status = CONFIRMED ou COMPLETED.

checkinStatus = EMBARQUED (Important : ne jamais écrire aux NO_SHOW).

reviewMailSent = false.

Boucle d'envoi :

Utiliser l'expéditeur EMAIL_FROM.experience.

Générer le HTML via le template.

Envoyer via lib/mailer.ts ou Resend.

Mise à jour : Passer reviewMailSent à true et créer un log REVIEW_EMAIL_SENT.

🤖 Phase 4 : Automatisation (Script Daily)
Objectif : Greffer l'envoi au processus de maintenance existant.

1. Mise à jour du script PowerShell
Fichier : daily-maintenance.ps1

Ajout (à la fin du script, avant la fin) :

PowerShell

# ... (Après le nettoyage et la rotation des avis existants)

Write-Host "5. Envoi des demandes d'avis (Expérience Client)..." -ForegroundColor Cyan

# Appel API local (l'application doit être up)
# On peut utiliser un secret dans le header pour sécuriser si besoin
try {
    $apiUrl = "http://localhost:3000/api/cron/send-reviews"
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST
    Write-Host "✅ Demandes d'avis traitées : $($response.processed)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Erreur lors de l'envoi des demandes d'avis : $_" -ForegroundColor Red
}

Write-Host "--- FIN MAINTENANCE ---" -ForegroundColor Cyan
✅ Checklist de Validation
[ ] Migration : La colonne reviewMailSent est bien en base de données.

[ ] Config : EMAIL_EXPERIENCE est défini dans le .env de production.

[ ] Code : lib/emailAddresses.ts compile sans erreur avec le nouveau rôle.

[ ] Test : Un envoi test a été reçu avec l'expéditeur correct (experience@sweet-narcisse.fr).

[ ] Sécurité : Les clients marqués NO_SHOW (absents) sont bien exclus de la requête SQL.