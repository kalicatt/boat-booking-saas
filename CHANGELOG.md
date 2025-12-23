# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and adheres to Semantic Versioning (MAJOR.MINOR.PATCH).

## [Unreleased]
- Pending changes will be listed here until the next tag.

---

## [2.0.0] - 2025-01-25
### 🚀 Android App - Refonte Native Complète

**BREAKING CHANGES:**
- Application Android reconstruite entièrement en natif Java (suppression de Capacitor)
- Architecture MVC moderne avec CameraX, ML Kit, Stripe Terminal SDK
- SDK minimum: Android 13 (API 33), Target SDK: Android 14 (API 35)

### Added - Phase 1: Architecture & Core
- **Activities natives** : MainActivity (splash), LoginActivity, DashboardActivity, ScannerActivity, CheckinConfirmationActivity
- **Authentification NextAuth** : Login credentials, session persistante, auto-redirect
- **Scanner QR avec auto check-in** : CameraX + ML Kit barcode scanning, check-in automatique (status EMBARQUED)
- **Couche API** : ApiClient (OkHttp + CookieJar), AuthService, BookingService
- Backend API: `POST /api/mobile/bookings/verify` - vérification QR + auto check-in

### Added - Phase 2a: Infrastructure Web→Mobile
- **PaymentPollingService** : Foreground service, polling toutes les 5s pour sessions de paiement
- **BroadcastReceiver** : Communication DashboardActivity ↔ PaymentActivity
- **PaymentActivity** : 2 modes (manuel / déclenché web)
- Backend APIs:
  - `GET /api/mobile/payments/sessions/claim` - polling, claim session PENDING
  - `PATCH /api/mobile/payments/sessions/:id` - update status (PROCESSING, SUCCEEDED, FAILED)
- Trigger automatique: web crée session → mobile poll → auto-open PaymentActivity avec données pré-remplies

### Added - Phase 2b: Paiement NFC Tap to Pay
- **Stripe Terminal SDK 4.7.6** : Intégration complète LocalMobile NFC
- **Flow paiement complet** : Découverte → Connexion → Create Intent → Collect (NFC tap) → Process → Confirm
- **PaymentActivity complet (454 lignes)** : 6 étapes avec progress indicators, error handling, cancelable operations
- Backend APIs:
  - `POST /api/mobile/payments/create-intent` - créer PaymentIntent Stripe avec metadata booking
  - `POST /api/mobile/payments/confirm` - confirmer paiement, update Booking (PAID), PaymentSession (SUCCEEDED)
  - `GET /api/mobile/stats/today` - stats check-ins et paiements du jour
- Update booking automatique: paymentStatus='PAID', paymentMethod='card', stripePaymentIntentId
- Logging: DocumentAuditLog action 'MOBILE_PAYMENT_SUCCESS'

### Added - Phase 3: Stats & Historique
- **StatsService** : getTodayStats() + getHistory()
- **Dashboard stats temps réel** : charge API stats, affiche "X embarquements", "XX.XX € encaissés (Y)", refresh auto onResume()
- **HistoryActivity** : RecyclerView + SwipeRefreshLayout, liste réservations 7 derniers jours
- **BookingHistoryAdapter** : Cards colorées par status (EMBARQUÉ=vert, CONFIRMÉ=bleu, ANNULÉ=rouge), icons paiement (💳 card, 💰 cash, ⏳ pending)
- Backend API: `GET /api/mobile/history` - liste bookings avec filtres (dateFrom, dateTo, status, boat, limit, offset)
- Pull-to-refresh, empty state, dates formatées FR (dd/MM/yyyy HH:mm)

### Added - Phase 4: Settings & Polish
- **SettingsActivity** : Langue, version dynamique (PackageInfo), à propos
- **Animations** : slide_in_bottom.xml, slide_out_bottom.xml - transitions fluides
- Material Design 3 cohérent sur toute l'app

### Documentation
- **BUILD_GUIDE.md** (480 lignes) : Build debug/release, tests manuels complets Phase 1-4, debugging (logcat, adb), performance (APK size, memory, battery), déploiement VPS, troubleshooting
- **android/README.md** (350 lignes) : Architecture détaillée, stack technique, configuration backend API, Stripe Terminal flow, statuts, sécurité, roadmap v2.1-v2.2
- **REFONTE_COMPLETE.md** (525 lignes) : Récapitulatif complet 9 commits, détails phases 0→4, statistiques (40+ fichiers, ~5000 lignes), features finales, leçons apprises
- **PHASE_5_TESTS.md** (479 lignes) : Checklist 40+ scénarios de test (fonctionnels, performance, réseau, sécurité, edge cases)
- **PHASE_6_DEPLOYMENT.md** (XXX lignes) : Guide déploiement complet (keystore, build release, upload VPS, versioning Git, page téléchargement, rollback plan)

### Changed
- Package name: `com.sweetnarcisse.admin`
- Version: 2.0.0 (versionCode 200)
- Min SDK: 33 (Android 13), Target SDK: 35 (Android 14)
- Gradle: 8.7.2, JDK: 17
- Dépendances principales:
  - Stripe Terminal SDK: 4.7.6
  - CameraX: 1.3.1
  - ML Kit barcode-scanning: 17.3.0
  - Material Design: 1.12.0
  - OkHttp: 4.12.0

### Removed
- Capacitor framework (3 fichiers supprimés)
- Cordova plugins

### Technical Details
**Commits Phase 0→4:**
- `32515c4` - Phase 0: Roadmap + API verify
- `881a477, 0ab6a8b, 064ff96, bc1f8c1` - Phase 1: Architecture & Core
- `f2f9a09` - Phase 2a: Web→Mobile trigger
- `d9ad4c8` - Phase 2b: Stripe Terminal NFC
- `bbbe1bc` - Phase 3: Stats & Historique
- `e1b0ae4` - Phase 4: Settings & Documentation
- `269d2cc` - Récapitulatif complet
- `71ee01f` - Checklist tests Phase 5

**Statistiques:**
- 40+ fichiers créés
- ~5000 lignes de code
- 6 backend APIs créées
- 8 Activities Android
- 5 Services API
- ~2000 lignes documentation

### Credits
- Developer: Kali
- Status: Production Ready 🚀

---

## [1.0.5] - 2025-12-05
### Added
- Ability to promote an existing `CLIENT` to `EMPLOYEE` directly from `/api/admin/employees` and the Admin UI, including automatic employee number generation and audit logs.
- Dedicated developer and user guides under `docs/` to capture architecture details, SOPs, and staff workflows.

### Changed
- Prisma seed now provisions default staff accounts with the safer `EMPLOYEE` role instead of `ADMIN`.
- Admin dashboard tiles and quick actions respect the refined permission matrix, preventing unauthorized widgets when ACLs change.

### Fixed
- Employees page table rendering, permission toggles, and booking email apostrophes that previously broke ESLint/TS builds.
- TypeScript definitions for admin permissions and the POST employees handler, restoring clean `npm run lint` / `npm run build` runs.

### Documentation
- `README.md`, `RELEASE.md`, and deployment instructions now link to the new guides and describe the maintenance script expectations.

### Credits
- Release owner: Lucas Servais.

---

## [1.0.4] - 2025-12-02
### Added
- `scripts/harden-vps.sh` to automate SSH hardening, firewall rules, and fail2ban setup on fresh servers.

### Changed
- Native splash screen, status bar, and launcher icons refreshed to align with the Sweet Narcisse branding.
- Capacitor configuration and environment defaults now target `https://sweet-narcisse.fr` with updated Android version metadata (`versionCode 100`, `versionName "Alpha Sweet-Narcisse"`).

### Documentation
- `README.md`, `DEPLOYMENT.md`, and `RELEASE.md` updated with the 1.0.4 workflow, VPS hardening guidance, and new release tagging steps.

### Credits
- Release owner: Lucas Servais.

---

## [1.0.3] - 2025-11-29
### Changed
- Booking creation now normalizes inherited payment metadata and applies the `shouldMarkPaid` guard consistently across chained reservations.
- Booking widget, contact forms, and payment components consume typed dictionaries to remove implicit `any` usage in client flows.

### Fixed
- PayPal capture and Stripe webhook handlers align with SDK typings and improved logging, clearing build blockers.
- Admin stats aggregation filters by Prisma `BookingStatus`, restoring API stability and successful Next.js builds.

### Documentation
- Release and Docker workflows updated for version `1.0.3`.

### Credits
- Release owner: Lucas Servais.

---

## [1.0.2] - 2025-11-29
### Added
- Flag icons displayed in the mobile/off-canvas language selector to make locale choices clear at a glance.

### Changed
- Centralised language metadata (labels, flags) to keep navigation and future locales consistent.

---

## [1.0.1] - 2025-11-28
### Changed
- Tailwind CSS stabilized (downgrade to v3, classic directives) to restore full styling in dev.
- PostCSS configuration migrated to CJS with explicit tailwindcss + autoprefixer plugins.

### Fixed
- Dynamic route `[lang]` updated to await `params` (Next.js 16 Promise-based params) preventing runtime error.
- Removed missing partner logo images causing layout 404s and instability.
- Eliminated duplicate global CSS import in nested layout.
- Disabled then re-enabled Turbopack with fallback script for future debugging.

### Added
- `tailwind.config.cjs` with content globs and extended theme tokens.
- Fallback `dev:webpack` script for development stability.

### Removed
- Temporary debug Tailwind badge from global styles.

---

## [1.0.0] - 2025-11-28
- Initial production-ready build.
- Docker multi-stage build (Node 22 bookworm) with Prisma compatibility.
- Email routes guarded when `RESEND_API_KEY` is missing.
- Vitest configuration with `@` alias resolution.
- Stripe webhook route updated to current API version literal.

### Added
- Deployment guide with tar-transfer and registry workflows.
- Systemd unit examples and Nginx reverse proxy notes.

### Fixed
- Build issues with route handler signatures and React email rendering.

### Security
- Notes on TLS, secret management, and Prisma/OpenSSL compatibility.

---
