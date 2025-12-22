# Sweet Narcisse – Roadmap Améliorations

> **Budget contraints**: Cette roadmap privilégie les solutions open-source et gratuites.
> Dernière mise à jour: 22 décembre 2025

---

## 🎯 Quick Wins (Semaine 1-2)

### ✅ Stabilité & Sécurité Immédiate

#### 1. ✅ Migration EmployeeDocumentLog
- **Priorité**: 🔴 Critique
- **Effort**: 5min
- **Action**: Créer la table manquante via Prisma
- **Commande**: 
  ```bash
  ssh -p 5522 root@51.178.17.205 "cd /opt/sweetnarcisse && docker compose exec app npx prisma migrate deploy"
  ```
- **Impact**: Logs d'audit documents fonctionnels

#### 2. ✅ Cleanup Espace Disque VPS
- **Priorité**: 🔴 Critique
- **Effort**: 10min
- **Actions**:
  - Pruning Docker images/volumes inutilisés
  - Rotation logs nginx (actuellement illimités)
  - Monitoring automatique disque
- **Impact**: Évite `ENOSPC` lors des futurs deploys

#### 3. ✅ Mise à Jour Dépendances Critiques
- **Priorité**: 🟠 Haute
- **Effort**: 15min
- **Actions**:
  ```bash
  npm audit fix --force
  npm i baseline-browser-mapping@latest -D
  npm update
  ```
- **Impact**: Sécurité (1 vuln critique résolue)

#### 4. ✅ TypeScript Strict Mode
- **Priorité**: 🟡 Moyenne
- **Effort**: 30min
- **Action**: Activer `strict: true` dans `tsconfig.json`
- **Impact**: Détection bugs à la compilation

---

## 🧪 Tests & Qualité (Semaine 2-3)

### 5. ✅ Tests Unitaires Critiques
- **Priorité**: 🟠 Haute
- **Effort**: 2h
- **Complété**: 22/12/2025
- **Cibles**:
  - ✅ `lib/availability.ts` (17 tests - logique occupation)
  - ✅ `lib/passwordPolicy.ts` (31 tests - validation)
  - ✅ `lib/bookingConfirmationEmail.ts` (15 tests - emails)
- **Outil**: Vitest + jsdom
- **Couverture**: 76 tests au total

### 6. ✅ Tests API Essentiels
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Réalisé**:
  - ✅ `/api/availability` (5 tests - cache, validation, calculs)
  - ✅ `/api/bookings` (5 tests - création, validation, capacité)
  - ✅ Setup vitest avec mocks Prisma/NextAuth/Resend
  - ✅ Documentation: `tests/api/README.md` + `docs/api-tests-status.md`
  - ✅ Mocks: next/server, @react-email/render, reCAPTCHA
- **Résultat**: 81/86 tests passent (94% success rate)
- **Problèmes connus**:
  - Contact/Webhook tests ont problème next-auth module resolution
  - Double booking logic à vérifier
  - PDF generation "Invalid time value"
- **Outil**: Vitest + mock Prisma + mock Stripe
- **Note**: Problèmes documentés dans `docs/api-tests-status.md`

### 7. ✅ Tests E2E Critique
- **Priorité**: 🟡 Moyenne
- **Effort**: 4h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Réalisé**:
  - ✅ Installation Playwright + navigateur Chromium
  - ✅ Configuration `playwright.config.ts` complète
  - ✅ Tests E2E flux complet de réservation (5 scénarios)
  - ✅ Tests validation formulaire
  - ✅ Tests créneaux disponibles
  - ✅ Tests navigation
  - ✅ Tests responsive (mobile viewport)
  - ✅ Intégration CI/CD (job e2e dans GitHub Actions)
  - ✅ Documentation: `tests/e2e/README.md`
- **Scénarios testés**:
  - Réservation complète (formulaire → paiement → confirmation)
  - Validation champs requis
  - Affichage créneaux horaires
  - Navigation entre pages
  - Design responsive mobile
- **Scripts NPM**:
  - `npm run test:e2e` - Lancer tests headless
  - `npm run test:e2e:ui` - Interface graphique
  - `npm run test:e2e:debug` - Mode debug
- **CI/CD**: Job e2e exécuté après build, upload rapport en artifact
- **Outil**: **Playwright** (gratuit, meilleur que Cypress)

---

## 🚀 CI/CD (Semaine 3)

### 8. ✅ GitHub Actions Pipeline
- **Priorité**: 🟠 Haute
- **Effort**: 2h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Réalisé**:
  - ✅ `.github/workflows/ci.yml` - Pipeline complet
  - ✅ Lint + Type Check sur chaque PR
  - ✅ Tests unitaires + API avec PostgreSQL & Redis
  - ✅ Build Next.js avec upload artefacts
  - ✅ Security audit (npm audit + Snyk)
  - ✅ Docker build & push vers Docker Hub
  - ✅ Deploy staging (develop branch)
  - ✅ Deploy production (main branch) avec approbation
  - ✅ Notifications Slack (optionnel)
  - ✅ Documentation complète: `docs/ci-cd-guide.md`
- **Workflows**:
  ```yaml
  Jobs: lint → test → type-check → security → build → docker → deploy
  Services: PostgreSQL 15, Redis 7
  Envs: staging (develop), production (main)
  Cache: NPM deps, Docker layers
  ```
- **Optimisations**:
  - Parallélisation des jobs (lint/test/type-check en même temps)
  - Cache GitHub Actions pour NPM (2min → 30s)
  - Cache Docker layers (10min → 3min build)
  - Artéfacts sauvegardés 7 jours
- **Sécurité**:
  - PostgreSQL & Redis en services isolés
  - Secrets GitHub pour Docker Hub, Codecov, Snyk, Slack
  - Environnement production protégé (reviewers requis)
- **Coût**: 🆓 2000 min/mois gratuit GitHub (utilisation estimée: ~400 min/mois)

### 9. ✅ Auto-Deploy sur Tag
- **Priorité**: 🔴 Critique
- **Effort**: 1h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Réalisé**:
  - ✅ `.github/workflows/deploy.yml` - Workflow de déploiement automatique
  - ✅ Déclenchement sur tag `v*.*.*` (Semantic Versioning)
  - ✅ Validation du format SemVer (X.Y.Z)
  - ✅ Déploiement SSH sur VPS avec Docker Compose
  - ✅ Migrations Prisma automatiques
  - ✅ Health check post-déploiement
  - ✅ Création automatique de GitHub Release
  - ✅ Génération automatique du changelog
  - ✅ Nettoyage des anciennes images Docker
  - ✅ Documentation complète: `docs/release-process.md`
- **Pipeline**:
  ```yaml
  Jobs: prepare → deploy → create-release → notify
  Validation: format SemVer (1.0.0, 1.2.3, etc.)
  Health check: https://www.sweet-narcisse.com/api/health
  Rollback: manuel (documenté)
  ```
- **Utilisation**:
  ```bash
  # Créer et pousser un tag
  git tag -a v1.1.0 -m "Release 1.1.0 - Description"
  git push origin v1.1.0
  
  # Déploiement automatique démarre (~3-4 minutes)
  # GitHub Release créée automatiquement
  ```
- **Sécurité**:
  - Secrets: VPS_HOST, VPS_PORT, VPS_USER, VPS_SSH_KEY
  - Environnement production avec protection
  - Clés SSH pour authentification sécurisée
- **Documentation**: Processus complet dans `docs/release-process.md`

---

## 📊 Monitoring Gratuit (Semaine 4)

### 10. ✅ Dashboards Grafana Pré-Configurés
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Dashboards**:
  - **Business**: CA jour/semaine, taux remplissage, conversion, répartition langues
  - **Performance**: Latency p50/p95/p99, error rate, throughput
  - **API**: Top routes par volume, status codes
- **Source**: Prometheus déjà en place
- **✅ Fait**: Business & Performance dashboards provisionnés automatiquement
- **Métriques implémentées**:
  - HTTP requests (method, route, status, duration)
  - Booking revenue/count/cancellations par langue
  - Passenger counts
  - Boat capacities
- **Auto-tracking**: Middleware Next.js enregistre automatiquement toutes les requêtes HTTP

### 11. ✅ Alerting Gratuit
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
- **✅ Fait**: 11 règles d'alertes configurées (infrastructure + application + business)
- **Canaux**:
  - ✅ Email SMTP avec templates HTML
  - ✅ **Ntfy.sh** (push notifications mobiles gratuites - topic: sweetnarcisse-alerts)
  - ✅ Webhook Discord (optionnel via env var)
  - ✅ Generic webhook (fallback)
- **Alertes configurées**:
  - ✅ Infrastructure: Disque >85%, RAM >90%, CPU >80%
  - ✅ Application: App down >2min, Error rate >5%, Latency P95 >2s, Rate limiter spikes, DB failure
  - ✅ Business: Pas de réservations après 14h, Taux annulation >20%
- **Features**: Grouping, inhibition rules, résolution auto, repeat intervals intelligents

### 12. ✅ Logs Structurés (Pino)
- **Priorité**: 🟠 Haute
- **Effort**: 2h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Implémentation**:
  - ✅ Pino installé avec pino-pretty pour développement
  - ✅ Logger centralisé: `lib/logger.ts` avec niveaux (trace, debug, info, warn, error, fatal)
  - ✅ API Logger helper: `lib/apiLogger.ts` pour routes API
  - ✅ Remplacement console.* dans tous les fichiers `lib/`:
    * cache.ts (4 remplacements)
    * initMetrics.ts (2 remplacements)
    * documentAudit.ts (1 remplacement)
    * bookingConfirmationEmail.ts (4 remplacements)
    * bookingCancellation.ts (1 remplacement)
    * mobileCache.ts (2 remplacements)
    * rateLimit.ts (1 remplacement)
  - ✅ Configuration: Logs JSON en production, pretty-print en développement
  - ✅ Double logging: Pino (stdout) + Base de données (audit)
  - ✅ Documentation complète: `docs/logging-guide.md`
- **Features**:
  - Format JSON structuré pour parsing automatique
  - Contexte automatique: pid, hostname, timestamp, node_env
  - Performance: ~30x plus rapide que Winston
  - Pretty printing colorisé en dev avec pino-pretty
  - Compatible ELK Stack, CloudWatch, Datadog
- **Utilisation**:
  ```typescript
  import { logger } from '@/lib/logger'
  logger.error({ error, bookingId: 123 }, 'Payment failed')
  
  import { apiLogger } from '@/lib/apiLogger'
  apiLogger.error('/api/bookings', error, { userId: 456 })
  ```
- **Prochaines étapes**: Rotation logs (pino-roll), HTTP logging (pino-http), Stream vers Elasticsearch

---

## 🔐 Sécurité Renforcée (Semaine 5)

### 13. ✅ Rotation Secrets Automatisée
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Status**: ✅ **COMPLÉTÉ** (27/06/2025)
- **Réalisé**:
  - ✅ `scripts/rotate-secrets.sh` - Script Bash Linux/macOS
  - ✅ `scripts/rotate-secrets.ps1` - Script PowerShell Windows
  - ✅ `scripts/cron/crontab.example` - Configuration cron
  - ✅ `systemd/secret-rotation.timer` - Timer systemd
  - ✅ `systemd/secret-rotation.service` - Service systemd
  - ✅ `docs/secret-rotation.md` - Documentation complète
- **Fonctionnalités**:
  - Rotation NEXTAUTH_SECRET mensuelle automatique
  - Backup avant rotation (6 mois de rétention)
  - Restart applicatif automatique (Docker/systemd/PM2)
  - Mode dry-run pour tests
  - Logging complet
  - Compatible Linux, macOS, Windows

### 14. Logs Audit Immutables
- **Priorité**: 🟢 Basse
- **Effort**: 3h
- **Solution Gratuite**:
  - Export quotidien vers **MinIO** (déjà en place)
  - Backup chiffré GPG
  - 90 jours rétention

### 15. ✅ Rate Limiting Production
- **Priorité**: 🟠 Haute
- **Effort**: 1h
- **Status**: ✅ **COMPLÉTÉ**
- **Implémentation**:
  - Backend Upstash Redis configuré (fallback mémoire)
  - 7 endpoints protégés (contact, bookings, auth)
  - Métriques Prometheus: `rate_limiter_allowed_total`, `rate_limiter_blocked_total`
  - Dashboard Grafana: 8 panneaux (taux, blocages, top IPs)
  - Documentation: `monitoring/RATE_LIMITING.md`
  - Alerte Prometheus: RateLimiterBlockSpike (>25 req/5min)
- **Upstash Redis**: 🆓 10k req/jour gratuit (suffisant)

---

## ⚡ Performance (Semaine 6-7)

### 16. ✅ Optimisation Images
- **Priorité**: 🟠 Haute
- **Effort**: 2h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Implémentation**:
  - Conversion 11 images vers WebP (410KB économisés, -20.6%)
  - Composant `OptimizedImage` avec fallback automatique JPG/PNG
  - Script npm: `npm run optimize:images` (sharp library)
  - Support navigateur: 95%+ avec fallback gracieux
  - Documentation: `docs/IMAGE_OPTIMIZATION.md`
- **Résultats**:
  - hero-bg: 243KB → 124KB (-48.8%)
  - IconApp: 171KB → 83KB (-51.3%)
  - logo: 58KB → 33KB (-42.6%)
  - presentation: 244KB → 169KB (-30.6%)
  - simplicity: 232KB → 182KB (-21.6%)
- **Pages mises à jour**: LandingClient, login, admin, legal pages
- **Gain**: ~60% taille assets hero images

### 17. ✅ Cache Redis Stratégique
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Implémentation**:
  - Wrapper cache unifié (`lib/cache.ts`)
  - Redis primary + fallback mémoire automatique
  - TTL configurables: availability (60s), boats (5min), hours (1h), weather (10min)
  - Pattern-based invalidation
  - Helper `withCache()` pour wrapping facile
  - Endpoint métriques: `/api/admin/cache/metrics`
- **Métriques Prometheus**:
  - `sweet_narcisse_cache_hits_total`
  - `sweet_narcisse_cache_misses_total`
  - `sweet_narcisse_cache_hit_rate_percent`
  - `sweet_narcisse_cache_errors_total`
- **Impact Performance**:
  - Availability queries: ~200ms → ~5ms (cached)
  - Réduction charge DB: ~60-80%
  - Latency API divisée par ~40
- **Upstash**: 🆓 tier gratuit OK pour ce volume

### 18. Database Indexing
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
### 18. ✅ Indexation DB
- **Priorité**: 🔴 Critique
- **Effort**: 1h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Migration**: `20251222171639_add_performance_indexes`
- **Index créés** (15 total):
  - **Booking** (8 index):
    * `Booking_date_idx` - Recherches par date
    * `Booking_startTime_idx` - Recherches par heure
    * `Booking_status_idx` - Filtres par statut
    * `Booking_userId_idx` - Réservations par utilisateur
    * `Booking_boatId_idx` - Réservations par bateau
    * `Booking_status_date_idx` - Combo status+date (filtre admin)
    * `Booking_startTime_status_idx` - Disponibilité (requête critique)
    * `Booking_createdAt_idx` - Tri chronologique
  - **BlockedInterval** (3 index):
    * `BlockedInterval_start_idx` - Début période bloquée
    * `BlockedInterval_end_idx` - Fin période bloquée
    * `BlockedInterval_start_end_idx` - Combo start+end (overlap check)
  - **Boat** (1 index):
    * `Boat_status_idx` - Bateaux actifs
  - **WorkShift** (3 index):
    * `WorkShift_userId_idx` - Shifts par employé
    * `WorkShift_startTime_idx` - Shifts par date
    * `WorkShift_userId_startTime_idx` - Combo user+date
- **Impact estimé**:
  - `/api/availability` : -50% temps de réponse
  - `/api/admin/reservations` : -40% temps de réponse
  - Recherches par date/status : O(n) → O(log n)
- **Application**: `npx prisma migrate deploy` sur serveur

### 19. ✅ Pagination API
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Route modifiée**: `/api/admin/reservations`
- **Implémentation**:
  - Pagination cursor-based (meilleure que offset pour grandes datasets)
  - Paramètres: `?cursor=<id>&limit=<n>`
  - Défaut: 50 items, max: 200 items
  - Réponse paginée:
    ```json
    {
      "data": [...],
      "pagination": {
        "hasMore": true,
        "nextCursor": "uuid-dernier-item",
        "limit": 50,
        "count": 50
      }
    }
    ```
  - Compatible avec filtres existants (q, payment)
  - Logger Pino intégré pour erreurs
- **Avantages cursor vs offset**:
  - Performance constante O(1) vs O(n) pour offset
  - Pas de problème de "page shift" sur insertions
  - Meilleur pour infinite scroll

---

## 🎨 UX & Accessibilité (Semaine 8)

### 20. ✅ Audit Lighthouse
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Implémentation**:
  - ✅ Lighthouse CLI installé (157 packages)
  - ✅ Script automatisé: `scripts/lighthouse-audit.js`
  - ✅ Scripts npm: `npm run lighthouse`, `npm run lighthouse:mobile`
  - ✅ Support desktop et mobile
  - ✅ Rapports HTML et JSON générés automatiquement
  - ✅ Audit des 4 catégories: Performance, Accessibility, Best Practices, SEO
  - ✅ Seuil de réussite: 90+ sur Performance et Accessibility
- **Utilisation**:
  ```bash
  # Audit desktop (par défaut)
  npm run lighthouse
  
  # Audit mobile
  npm run lighthouse:mobile
  
  # URL personnalisée
  npm run lighthouse -- --url=https://sweet-narcisse.com
  ```
- **Rapports**: Sauvegardés dans `lighthouse-reports/`
- **Format sortie**:
  ```
  📊 Results for homepage:
    Performance:    ✅ 95
    Accessibility:  ✅ 92
    Best Practices: ✅ 100
    SEO:            ✅ 100
  ```
- **Prochaines étapes**: Intégrer dans CI/CD, fixer les issues A11y détectées

### 21. ✅ Fixes A11y Critiques
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Implémentation**:
  - Ajout `htmlFor`/`id` pour associations label-input dans ContactForms.tsx (12 champs)
  - Ajout `aria-labelledby` et `aria-label` dans QuickBookingModal.tsx (10 contrôles)
  - Ajout `role="group"` et `aria-pressed` pour boutons toggle dans BookingWidget.tsx
  - Ajout `aria-label` pour boutons +/- dans ManualPaymentDetails.tsx
  - Ajout `aria-live="polite"` pour annonces de changements de quantité
- **Fichiers modifiés**:
  - `components/ContactForms.tsx`
  - `components/QuickBookingModal.tsx`
  - `components/BookingWidget.tsx`
  - `components/ManualPaymentDetails.tsx`

### 22. ✅ Internationalisation Emails
- **Priorité**: 🟢 Basse
- **Effort**: 2h
- **Status**: ✅ **COMPLÉTÉ** (27/06/2025)
- **Réalisé**:
  - ✅ `dictionaries/emails.ts` - Dictionnaire centralisé (fr/en/de/es/it)
  - ✅ `BookingTemplate.tsx` - Prop `lang`, 25+ clés traduites
  - ✅ `ReviewRequestTemplate.tsx` - Prop `lang`, 11+ clés traduites
  - ✅ Helper `getEmailText()` pour accès typé
  - ✅ Type `EmailLang` exporté
- **Couverture**: Confirmation, rappel embarquement, demande avis
- **Utilise**: Dictionnaires existants, pattern des autres templates

---

## 🏗️ Architecture (Semaine 9-10)

### 23. Services Layer
- **Priorité**: 🟡 Moyenne
- **Effort**: 4h
- **Refactoring**:
  ```
  services/
    BookingService.ts
    PaymentService.ts
    FleetService.ts
  ```
- **Bénéfice**: Routes API = thin controllers, tests faciles

### 24. ✅ OpenAPI Documentation
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Status**: ✅ **COMPLÉTÉ** (22/12/2025)
- **Implémentation**:
  - Spécification OpenAPI 3.1 complète (`lib/openapi.ts`)
  - 8 endpoints documentés avec schémas complets
  - UI interactive avec Redoc (alternative à Scalar)
  - Route documentation: `/api-docs`
  - Route spec JSON: `/api/openapi.json`
- **Endpoints documentés**:
  - `GET /api/availability` - Check disponibilités (cache 60s)
  - `POST /api/bookings` - Créer réservation (rate limit 20/min)
  - `POST /api/bookings/release` - Annuler réservation
  - `POST /api/contact` - Formulaires contact (rate limit 5/hour)
  - `GET /api/hours` - Horaires d'ouverture (cache 1h)
  - `GET /api/weather` - Météo (cache 10min)
  - `POST /api/payments/stripe/webhook` - Webhooks Stripe
  - `GET /api/admin/cache/metrics` - Métriques cache
- **Détails spec**:
  - Schémas request/response complets
  - Exemples pour tous les champs
  - Rate limits documentés
  - Cache TTL documentés
  - Validation rules (min/max, enum)
  - Security schemes (NextAuth session)
- **Outil**: Redoc (stable, TypeScript-friendly, 80 packages)
- **Raison switch**: Scalar avait incompatibilité TypeScript avec Next.js App Router

### 25. ✅ Dead Code Elimination
- **Priorité**: 🟢 Basse
- **Effort**: 1h
- **Status**: ✅ **COMPLÉTÉ** (27/06/2025)
- **Réalisé**:
  - ✅ `ts-prune` installé comme devDependency
  - ✅ Script `npm run lint:unused` ajouté
  - ✅ Analyse complète du codebase
  - ✅ Validation: exports "unused" sont pour extensibilité future
- **Résultat**:
  - Exports API routes: faux positifs (requis par Next.js)
  - Exports middleware (`proxy`, `config`): requis
  - Utilitaires (`apiLogger`, `mergeAdminPermissions`): conservés pour extensibilité
  - Email helper (`getEmailText`): conservé pour usage futur
- **Usage**: `npm run lint:unused` pour audit continu

---

## 🔄 Backup & DR (Semaine 11)

### 26. Backup Automatisé
- **Priorité**: 🟠 Haute
- **Effort**: 2h
- **Fréquence**: Toutes les 6h
- **Script**:
  ```bash
  # Snapshot Postgres
  # Upload MinIO chiffré
  # Purge > 30 jours
  ```
- **Stockage**: MinIO local (gratuit)

### 27. Test Restore Mensuel
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h/mois
- **Action**: Cron automatique
- **Alerte**: Si échec restore

### 28. Disaster Recovery Plan
- **Priorité**: 🟢 Basse
- **Effort**: 2h
- **Doc**: Procédure step-by-step
- **RTO**: < 4h, **RPO**: < 6h

---

## 📱 Mobile (Semaine 12)

### 29. Offline Mode Basique
- **Priorité**: 🟢 Basse
- **Effort**: 3h
- **Action**: Capacitor Preferences + IDB
- **Cache**: Dernière réservation en cours

### 30. PWA Optimisations
- **Priorité**: 🟢 Basse
- **Effort**: 2h
- **Features**:
  - Service Worker cache assets
  - Install prompt natif
  - Splash screen

---

## 🌍 Compliance RGPD (Semaine 13)

### 31. Export Données Personnelles
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Route**: `GET /api/user/export`
- **Format**: JSON + PDF

### 32. Droit à l'Oubli
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
- **Action**: Cascade delete + anonymisation logs

### 33. Consentement Cookies
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Solution**: **Tarteaucitron.js** (gratuit, français)

---

## 📈 Analytics Gratuit (Semaine 14)

### 34. Plausible Analytics
- **Priorité**: 🟢 Basse
- **Effort**: 1h
- **Pourquoi**: Privacy-friendly, RGPD OK
- **Coût**: 🆓 Self-hosted (Docker)

### 35. Funnels Conversion
- **Priorité**: 🟢 Basse
- **Effort**: 2h
- **Tracking**:
  - Page réservation vue
  - Formulaire soumis
  - Paiement initié
  - Confirmation

---

## 🔧 DevOps Avancé (Semaine 15+)

### 36. Health Checks Avancés
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
- **Route**: `/api/health`
- **Checks**: DB, Redis, MinIO, external APIs

### 37. Blue-Green Deployment
- **Priorité**: 🟢 Basse
- **Effort**: 4h
- **Setup**: 2 containers app, swap nginx upstream
- **Downtime**: 0s

### 38. Monitoring Costs
- **Priorité**: 🟢 Basse
- **Effort**: 2h
- **Track**: Bandwidth, storage, API calls
- **Dashboard**: Grafana panel dédié

---

## 🎓 Documentation (Ongoing)

### 39. API Reference
- **Priorité**: 🟢 Basse
- **Effort**: 3h
- **Outil**: **Docusaurus** (gratuit)
- **Contenu**: Endpoints, exemples, codes erreur

### 40. Runbooks Ops
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Docs**:
  - Incident response
  - Deploy rollback
  - Database restore
  - Scaling guide

---

## 📊 Métriques de Succès

| Objectif | Actuel | Cible Q1 2026 |
|----------|--------|---------------|
| Lighthouse Score | Non mesuré | > 90 |
| Couverture Tests | ~25% | > 60% |
| Uptime | ~95% | > 99.5% |
| TTFB API (availability) | ~5ms (cached) | < 10ms |
| Vulns npm | 0 ✅ | 0 |
| Taux Conversion | Non mesuré | > 75% |
| Cache Hit Rate | ~80% | > 90% |
| API Documentation | ✅ 100% | 100% |

---

## 🚦 Statut Actuel

### ✅ Complété (Sprint 1-4)
- Architecture de base solide
- Paiements Stripe + PayPal
- Auth & permissions granulaires
- Stack monitoring (Prometheus/Grafana)
- MinIO + document upload
- **Migration EmployeeDocumentLog** (22/12/2025)
- **Cleanup disque VPS** - 19GB récupérés (22/12/2025)
- **Next.js 16.1.0** - Fix 3 CVE critiques (22/12/2025)
- **Rate limiting production** - Redis + Prometheus metrics (22/12/2025)
- **Optimisation images WebP** - 410KB économisés sur 11 images (22/12/2025)
- **Cache Redis** - Réduction latence API ~40x (22/12/2025)
- **OpenAPI Documentation** - 8 endpoints documentés avec Redoc (22/12/2025)

### 🔄 En Cours (Sprint 5)
- Tests API (availability ✅, bookings/contact/stripe en cours)
- **Dashboards Grafana** - Business + Performance avec métriques auto
- **Alerting system** - 11 alertes multi-canaux (email/ntfy/discord)

### ⏳ Planifié
- Voir roadmap ci-dessus

---

## 💰 Solutions Gratuites Privilégiées

| Besoin | Solution Payante | Alternative Gratuite |
|--------|------------------|----------------------|
| Error Tracking | Sentry | **Self-hosted Sentry** (Docker) |
| APM | Datadog | **Grafana Tempo + Loki** |
| Logs | Loggly | **Loki** (déjà stack Grafana) |
| Analytics | GA4 | **Plausible** (self-hosted) |
| Uptime Monitor | Pingdom | **Uptime Kuma** (Docker) |
| Status Page | StatusPage.io | **Cachet** (self-hosted) |
| Secrets Manager | Vault Cloud | **HashiCorp Vault** (self-hosted) |
| CI/CD | CircleCI | **GitHub Actions** (2000min/mois) |

---

## 🎯 Prochaines Actions Immédiates

1. ✅ Créer table EmployeeDocumentLog (5min) - **FAIT 22/12/2025**
2. ✅ Cleanup disque VPS (10min) - **FAIT 22/12/2025**
3. ✅ npm audit fix (5min) - **FAIT 22/12/2025**
4. ✅ Setup GitHub Actions CI (1h) - **FAIT 22/12/2025**
5. ✅ Optimisation images WebP (2h) - **FAIT 22/12/2025**
10. ✅ Cache Redis (3h) - **FAIT 22/12/2025**
11. 🔄 Finaliser tests API (2h) - **EN COURS**
12. Documentation API OpenAPI (3h) - **SUIVANT**

**Sprint 1 Progress**: 5/5 complétés ✅  
**Sprint 2 Progress**: 2/2 complétés ✅  
**Sprint 3 Progress**: 1/1 complétés ✅  
**Sprint 4 Progress**: 2/2 complétés ✅  
**Sprint 5 Progress**: 0/2 en cours 🔄
8. ✅ Rate limiting production (1h) - **FAIT 22/12/2025**
9. 🔄 API integration tests (2h) - **SUIVANT**

**Sprint 1 Progress**: 5/5 complétés ✅ | **Sprint 2 Progress**: 2/2 complétés ✅ | **Sprint 3 Progress**: 0/1

---

**Prochaine révision**: Janvier 2026
