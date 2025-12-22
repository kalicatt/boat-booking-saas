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

### 6. Tests API Essentiels
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Routes**:
  - `POST /api/bookings` (création réservation)
  - `POST /api/payments/stripe` (webhook)
  - `GET /api/availability` (disponibilités)
- **Setup**: Supertest + mock Prisma

### 7. Tests E2E Critique
- **Priorité**: 🟡 Moyenne
- **Effort**: 4h
- **Scénario**: Réservation complète (formulaire → paiement → confirmation)
- **Outil**: **Playwright** (gratuit, meilleur que Cypress)

---

## 🚀 CI/CD (Semaine 3)

### 8. ✅ GitHub Actions Pipeline
- **Priorité**: 🟠 Haute
- **Effort**: 2h
- **Workflows**:
  ```yaml
  # .github/workflows/ci.yml
  - Lint + Type Check sur chaque PR
  - Tests unitaires + couverture
  - Build Docker preview
  - Scan sécurité Trivy (gratuit)
  ```
- **Coût**: 🆓 2000 min/mois gratuit GitHub

### 9. Auto-Deploy sur Tag
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
- **Trigger**: `git push origin v1.0.x`
- **Action**: Build + push + SSH deploy VPS

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

### 12. Logs Structurés
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Remplacer**: `console.error` → **Pino** (gratuit, très rapide)
- **Format**: JSON avec context (userId, requestId)

---

## 🔐 Sécurité Renforcée (Semaine 5)

### 13. Rotation Secrets Automatisée
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Solution**: Script cron mensuel
  ```bash
  # Génère nouveau NEXTAUTH_SECRET
  # Update .env.production.local
  # Rolling restart app
  ```

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

### 16. Optimisation Images
- **Priorité**: 🟠 Haute
- **Effort**: 2h
- **Actions**:
  - Next.js `<Image>` partout
  - Conversion WebP (script batch)
  - Lazy loading systématique
- **Gain**: ~60% taille assets

### 17. Cache Redis Stratégique
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Cibles**:
  - `/api/weather` (15min TTL)
  - Liste barques actives (1h TTL)
  - Config site CMS (5min TTL)
- **Upstash**: 🆓 tier gratuit OK pour ce volume

### 18. Database Indexing
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
- **Action**: Analyser slow queries Postgres
  ```sql
  SELECT query, mean_exec_time 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC LIMIT 10;
  ```
- **Ajouter index** si nécessaire

### 19. Pagination API
- **Priorité**: 🟡 Moyenne
- **Effort**: 2h
- **Routes**: `/api/admin/reservations`, `/api/admin/employees`
- **Cursor-based** Prisma (meilleur que offset)

---

## 🎨 UX & Accessibilité (Semaine 8)

### 20. Audit Lighthouse
- **Priorité**: 🟡 Moyenne
- **Effort**: 1h
- **Outil**: Chrome DevTools (gratuit)
- **Objectif**: Score > 90 Performance + A11y

### 21. Fixes A11y Critiques
- **Priorité**: 🟡 Moyenne
- **Effort**: 3h
- **Actions**:
  - Labels ARIA manquants
  - Contraste couleurs (WCAG AA)
  - Navigation clavier complète
- **Outil**: **axe DevTools** (gratuit)

### 22. Internationalisation Emails
- **Priorité**: 🟢 Basse
- **Effort**: 2h
- **Action**: Templates React Email multilingues
- **Utilise**: Dictionnaires existants

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

### 24. OpenAPI Documentation
- **Priorité**: 🟢 Basse
- **Effort**: 3h
- **Outil**: **Scalar** (gratuit, auto-gen depuis Zod)
- **Route**: `/api-docs`

### 25. Dead Code Elimination
- **Priorité**: 🟢 Basse
- **Effort**: 1h
- **Outil**: `ts-prune` (gratuit)
- **Action**: Supprimer imports inutilisés

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
| Couverture Tests | ~5% | > 60% |
| Uptime | ~95% | > 99.5% |
| TTFB API | Non mesuré | < 200ms |
| Vulns npm | 1 critique | 0 |
| Taux Conversion | Non mesuré | > 75% |

---

## 🚦 Statut Actuel

### ✅ Complété
- Architecture de base solide
- Paiements Stripe + PayPal
- Auth & permissions granulaires
- Stack monitoring (Prometheus/Grafana)
- MinIO + document upload
- **Migration EmployeeDocumentLog** (22/12/2025)
- **Cleanup disque VPS** - 19GB récupérés (22/12/2025)
- **Next.js 16.1.0** - Fix 3 CVE critiques (22/12/2025)
- **GitHub Actions CI** - Tests + Lint + Security (22/12/2025)
- **0 vulnérabilités npm** (22/12/2025)
- **Tests unitaires** - 76 tests couvrant la logique critique (22/12/2025)
- **Dashboards Grafana** - Business + Performance avec métriques auto (22/12/2025)
- **Alerting system** - 11 alertes multi-canaux (email/ntfy/discord) (22/12/2025)

### 🔄 En Cours
- Rate limiting production

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
5. ✅ Tests unitaires critiques (2h) - **FAIT 22/12/2025**
6. ✅ Dashboards Grafana (3h) - **FAIT 22/12/2025**
7. ✅ Configuration alerting (1h) - **FAIT 22/12/2025**
8. ✅ Rate limiting production (1h) - **FAIT 22/12/2025**
9. 🔄 API integration tests (2h) - **SUIVANT**

**Sprint 1 Progress**: 5/5 complétés ✅ | **Sprint 2 Progress**: 2/2 complétés ✅ | **Sprint 3 Progress**: 0/1

---

**Prochaine révision**: Janvier 2026
