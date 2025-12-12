# Roadmap Projet Sweet Narcisse

Roadmap révisée pour aligner les priorités produit avec l'architecture Next.js/Prisma actuelle.

## Phase 1 · Expérience Utilisateur & Tunnel de Réservation (Priorité haute)
Objectif : stabiliser le parcours client, corriger les bugs visibles et sécuriser les conversions.

### Internationalisation & Contenu
- **Tâches** : compléter les traductions juridiques (mentions légales, CGV, politiques) pour l'italien et l'espagnol.
- **Spécifications techniques** :
  - Mettre à jour `dictionaries/it.json` et `dictionaries/es.json` en conservant la structure clé/valeur existante.
  - Vérifier le chargement dynamique via `lib/get-dictionary.ts` et les modales CGV (`app/[lang]/(marketing)/components/LegalModal.tsx` si présentes) pour s'assurer que chaque clé est référencée.
  - Ajuster la copie front (sections hero / widgets info) afin de supprimer l'annonce de tours disponibles en italien/espagnol tant que l'offre n'existe pas (mise à jour des clés de traduction et des composants concernés dans `components/LandingClient.tsx` et `components/BookingWidget.tsx`).

### Délais de Réservation
- **Tâches** : imposer un délai minimum de 30 minutes avant le départ.
- **Spécifications techniques** :
  - Centraliser la valeur dans `lib/config.ts` (ex. `MIN_BOOKING_DELAY_MINUTES = 30`).
  - Valider côté API (routes `app/api/booking/*`) et côté client (`components/BookingWidget.tsx`) via les schémas Zod existants.
  - Exposer la valeur dans l'UI pour informer l'utilisateur.

### Chronomètre de Paiement (Frontend)
- **Tâches** : afficher un compte à rebours sur la page de paiement.
- **Spécifications techniques** :
  - Créer un composant `PaymentCountdown` dans `components/` utilisant `lib/time.ts` pour calculer `createdAt + 5 min`.
  - Synchroniser avec la session de paiement fournie par Stripe (données envoyées par `app/api/checkout/session`).
  - À expiration : désactiver les boutons (`components/PaymentElementWrapper.tsx`, `components/StripeWalletButton.tsx`) et rediriger vers le panier.

### Nettoyage Automatique des Réservations Pending (Backend)
- **Tâches** : purger les réservations incomplètes.
- **Spécifications techniques** :
  - Ajouter un script cron (ex. `scripts/cron/cleanupPendingBookings.ts`) déclenché toutes les 5 minutes via `systemd` ou `daily-maintenance.ps1`.
  - Requête Prisma équivalente : `prisma.booking.deleteMany({ where: { status: 'PENDING', createdAt: { lt: subMinutes(new Date(), 5) } } })`.
  - Écouter `payment_intent.canceled` côté `lib/payments/stripe.ts` pour libérer instantanément les créneaux.

  Product polish: Consider adding a small alert/CTA in the confirmation screen guiding users to their email or next steps (voucher pick-up, directions, etc.).

### Interface Météo
- **Tâches** : fiabiliser et lisser l'affichage météo.
- **Spécifications techniques** :
  - Conserver uniquement le mini-widget présent dans le header public (`components/ThemeToggle.tsx` / composant dédié) et retirer les blocs météo des autres pages marketing.
  - Créer une page dédiée (ex. `app/[lang]/weather/page.tsx`) regroupant les informations météo détaillées et l'historique des alertes vent.
  - S'appuyer sur `app/admin/_components/WeatherWidget.tsx` et `WeatherBadge.tsx` pour mutualiser l'affichage.
  - Mettre en cache les appels OpenWeatherMap via `lib/memoCache.ts` en mémoire (Redis viendra plus tard) avec une `staleTime` ≥ 1 h.
  - Centraliser la configuration API (`WEATHER_API_KEY`, `WEATHER_LAT/LON`) dans `.env.production.local` et exposer uniquement les variables publiques nécessaires.

## Phase 2 · Administration & Gestion Interne
Objectif : fournir des outils fiables aux équipes internes.

### Gestion des Employés (RH)
- **Dépôt de fichiers** :
  - Stockage S3/MinIO via un service dédié (`lib/storage.ts` à créer).
  - Générer des URL pré-signées côté API (`app/api/admin/files/*`) pour éviter d'exposer S3.
  - Clés normalisées `employees/{userId}/{documentId}/{slug}` pour simplifier l'archivage/purge et limiter les collisions.
  - Prévoir des TTL distincts upload (5 min) / download (1 min) via variables d'environnement (`STORAGE_*`).
- **Archivage & GDPR** :
  - Étendre `User` avec `isActive`, `employmentEndDate`, `archiveReason` et empêcher l'accès aux comptes désactivés.
  - Nouvelle table `EmployeeDocument` (statut, version, métadonnées fichiers, `archivedAt`), reliée à chaque employé.
  - Endpoints d'archivage (`POST /admin/employees/:id/archive` & `reactivate`) qui marquent le compte inactif, conservent les documents et invalident les sessions.
  - Cron (`scripts/cron/purgeEmployeeDocs.ts`) pour supprimer physiquement les objets (`archivedAt` ou `expiresAt` dépassé), sinon ils restent disponibles pour réembauche.
- **UI & sécurité** :
  - Onglet Documents dans la fiche employé (liste, upload, archive, aperçu PDF intégré via viewer `PdfViewer`).
  - Filtrer `isActive=false` dans toutes les vues (carte équipe, contacts, accès admin) et afficher un écran "Compte désactivé" côté employé.
  - Journaliser toutes les actions de fichiers (upload, download, archive) pour audit.

### Gestion des Aléas & Communication
- **Annulation météo** :
  - UI : bouton d'urgence dans `app/admin/_components/QuickActions.tsx` pour sélectionner plusieurs créneaux.
  - Backend : endpoint `app/api/admin/bookings/cancel` appelant Stripe Refund (`lib/payments/stripe.ts`) et PayPal (`lib/paypal.ts`).
  - Email : templates dédiés dans `components/emails/` et envoi via `lib/mailer.ts`.
- **Facturation PDF & Emails** :
  - Exploiter `lib/invoicePdf.ts` (Puppeteer ou react-pdf) pour générer les factures.
  - Joindre les PDF via Resend (SMTP) avec `lib/emailRender.ts`.

## Phase 3 · Infrastructure, Sécurité & DevOps
Objectif : préparer la montée en charge et la conformité.

### Sécurité & Performance
- **Reverse proxy** : renforcer `nginx/nginx.conf` (rate limiting, headers `X-Frame-Options`, suppression `X-Powered-By`).
- **Rate limiting applicatif** : préparer `lib/rateLimit.ts` pour Redis mais commencer par un quota en mémoire tant que le service Upstash n'est pas provisionné.
- **Observabilité** : compléter `monitoring/` (Prometheus, Alertmanager, Grafana) avec métriques personnalisées exposées via `lib/metrics.ts`.

### Déploiement Zéro Coupure
- **Pipeline** : GitHub Actions qui build l'image (`Dockerfile`), pousse dans un registre privé puis déclenche `docker compose pull && up -d` sur le VPS.
- **Rolling updates** : étudier Docker Swarm ou Kubernetes ; à court terme, utiliser `docker compose` avec deux instances `app` derrière Nginx (`up --scale app=2`).
- **Tests** : renforcer `vitest` + tests end-to-end avant déploiement.

### Base de Données Haute Dispo
- **Externalisation** : planifier migration vers un Postgres managé (RDS, Render, DO Managed DB).
- **Backups** : automatiser `pg_dump` quotidien vers un bucket S3 (script dans `scripts/backup/pg_dump_to_s3.sh`).
- **Réplication** : prévoir un replica read-only pour les dashboards.

## Phase 4 · Évolutions Commerciales & SaaS
Objectif : préparer l'industrialisation et les nouvelles offres.

### Paiement Physique (Stripe Terminal)
- **Tâches** : intégrer les lecteurs physiques.
- **Spécifications techniques** :
  - Backend : étendre `lib/payments/stripe.ts` avec les endpoints Terminal (create connection token, process PaymentIntent).
  - UI : ajouter une vue opérateur dans `app/admin/terminal/` pour lancer les paiements.
  - Réseau : sécuriser les accès du lecteur (VLAN dédié ou Wi-Fi isolé).

### Offre SaaS / Multi-tenant
- **Architecture** :
  - Option logique : ajouter `organizationId` sur les tables Prisma et filtrer via `lib/business.ts`.
  - Option physique : déployer une base par client (nécessite orchestration Terraform + migrations multi-cibles).
- **Provisioning** : automatiser la création d'un tenant (scripts `scripts/saas/provisionTenant.ts`).

### Migration & ETL
- **Stratégie** :
  - Export des données existantes (SQL -> CSV/JSON).
  - Transformations via Node.js (`scripts/etl/transformBookings.ts`) ou Python.
  - Import avec Prisma `createMany` en lot pour limiter les temps d'arrêt.

---
Suivi : prioriser chaque bloc avec des issues GitHub, lier aux dossiers correspondants et planifier les livraisons sur 4 sprints (2 semaines) pour la phase 1, puis réévaluer les dépendances techniques avant d'attaquer la phase 2.
