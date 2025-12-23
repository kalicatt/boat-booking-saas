# Android App v2.0.0 - Suivi de progression

## 📊 Vue d'ensemble

| Phase | Statut | Progression | Commits | Temps estimé | Temps réel |
|-------|--------|-------------|---------|--------------|------------|
| Phase 0: Roadmap & Planning | ✅ Terminé | 100% | 32515c4 | 2h | 1.5h |
| Phase 1: Architecture & Core | ✅ Terminé | 100% | 881a477, 0ab6a8b, 064ff96 | 8h | 6h |
| Phase 2: Stripe Tap to Pay | ⏳ En attente | 0% | - | 6h | - |
| Phase 3: Stats & Historique | ⏳ En attente | 0% | - | 4h | - |
| Phase 4: Settings & Polish | ⏳ En attente | 0% | - | 3h | - |
| Phase 5: Tests & Debug | ⏳ En attente | 0% | - | 4h | - |
| **TOTAL** | **20%** | **2/7** | **4 commits** | **27h** | **7.5h** |

## ✅ Phase 0: Roadmap & Planning - TERMINÉ

**Objectif:** Audit API existantes, planification architecture

**Réalisations:**
- ✅ Document roadmap complet 7 phases
- ✅ Wireframes et flows
- ✅ Audit API (90% existantes)
- ✅ Inventaire technologies
- ✅ Architecture diagrams

**Livrables:**
- `ROADMAP/android-app-refonte.md`
- `app/api/mobile/bookings/verify/route.ts`
- `app/api/mobile/bookings/verify/TEST.md`

**Commit:** 32515c4

---

## ✅ Phase 1: Architecture & Core - TERMINÉ

**Objectif:** Setup projet, auth, scanner QR, auto check-in

### Sous-tâches

- ✅ Cleanup projet (suppression Capacitor)
- ✅ Mise à jour build.gradle (SDK 35, Java 17)
- ✅ Ajout dépendances (CameraX, ML Kit, Material 3, OkHttp, Stripe)
- ✅ Application class (SweetNarcisseApp)
- ✅ MainActivity (splash + router)
- ✅ LoginActivity (auth NextAuth)
- ✅ DashboardActivity (stats + actions)
- ✅ ScannerActivity (CameraX + ML Kit)
- ✅ CheckinConfirmationActivity
- ✅ PaymentActivity (stub)
- ✅ API Layer (ApiClient, AuthService, BookingService)
- ✅ Models (LoginRequest/Response, BookingResponse)
- ✅ Layouts XML (5 activities)
- ✅ AndroidManifest.xml (permissions + activities)
- ✅ Documentation (rapport Phase 1, guide build)

### Fichiers créés: 18
### Fichiers supprimés: 3
### Fichiers modifiés: 4
### Lignes code: +1979 / -1097

**Commits:** 
- 881a477 - Refonte app native v2.0.0 - Phase 1
- 0ab6a8b - Rapport Phase 1
- 064ff96 - Guide build

---

## 🔄 Phase 2: Stripe Terminal Tap to Pay

**Objectif:** Implémenter paiement NFC avec Stripe Terminal + intégration QuickBookingModal

**Statut:** En cours

### Architecture

**2 modes de paiement:**

1. **Mode Manuel** (depuis app Android)
   - Employé entre montant manuellement
   - Crée PaymentIntent direct
   - Collect payment → Success

2. **Mode Déclenché** (depuis QuickBookingModal web) ⭐ NOUVEAU
   - Admin web crée réservation avec "paiement par carte"
   - Backend crée `PaymentSession` (table déjà existante)
   - App Android **poll** les sessions pending
   - Auto-ouverture PaymentActivity avec montant pré-rempli
   - Employé tape carte → Payment collecté

### Sous-tâches restantes

**Backend (déjà fait ✅):**
- ✅ API `POST /api/payments/terminal/session` (existe)
- ✅ Table `PaymentSession` (existe)
- ✅ `createPaymentSession()` (existe)
- ✅ `claimNextSession(deviceId)` (existe)
- ✅ QuickBookingModal trigger (existe)

**Android Phase 2:**
- [ ] Initialiser StripeTerminal dans SweetNarcisseApp
- [ ] Créer TerminalEventListener
- [ ] **Polling Service:**
  - [ ] PollingService.java (foreground service)
  - [ ] Poll `/api/mobile/payments/sessions/claim` toutes les 5s
  - [ ] Si session claimed → broadcast Intent
  - [ ] DashboardActivity reçoit broadcast → ouvre PaymentActivity
- [ ] Implémenter PaymentActivity complet:
  - [ ] Mode 1: Input montant manuel (EditText)
  - [ ] Mode 2: Montant pré-rempli depuis session
  - [ ] Discover readers (LocalMobile)
  - [ ] Connect reader
  - [ ] Créer PaymentIntent via Stripe
  - [ ] Collect payment method (NFC tap)
  - [ ] Process payment
  - [ ] Confirmation success/failure
  - [ ] Update PaymentSession status
- [ ] Créer PaymentService.java (API calls)
- [ ] Layout activity_payment.xml complet
- [ ] Animations NFC (lottie ou custom)
- [ ] Gestion erreurs (timeout, cancelled, declined)
- [ ] Tests device physique avec NFC

**API Android à créer:**
```
GET  /api/mobile/payments/sessions/claim (device polling)
POST /api/mobile/payments/create-intent
POST /api/mobile/payments/confirm
GET  /api/mobile/payments/:id
PATCH /api/mobile/payments/sessions/:id/status
```

**Dépendances déjà ajoutées:**
- ✅ Stripe Terminal SDK 4.7.6

**Documentation Stripe:**
- https://stripe.com/docs/terminal/payments/setup-reader/tap-to-pay-android

**Temps estimé:** 6 heures

---

## ⏳ Phase 3: Stats & Historique

**Objectif:** Afficher vraies stats dashboard + historique réservations

**Statut:** Pas commencé

### Sous-tâches restantes

- [ ] Créer HistoryActivity.java
- [ ] Layout activity_history.xml avec RecyclerView
- [ ] Adapter pour liste réservations
- [ ] ViewHolder avec card design
- [ ] API GET `/api/mobile/stats/today`
- [ ] API GET `/api/mobile/history` (pagination)
- [ ] Parser stats dans DashboardActivity
- [ ] Refresh stats au retour dashboard
- [ ] Filtres historique (date, status, bateau)
- [ ] Pull-to-refresh
- [ ] Détails réservation au clic

**Models à créer:**
- StatsResponse.java
- HistoryResponse.java
- BookingListItem.java

**Temps estimé:** 4 heures

---

## ⏳ Phase 4: Settings & Polish

**Objectif:** Settings, animations, améliorations UX

**Statut:** Pas commencé

### Sous-tâches restantes

- [ ] Créer SettingsActivity avec PreferenceScreen
- [ ] Préférences:
  - [ ] Langue app (fr, en, es, de, it)
  - [ ] Auto-logout timeout
  - [ ] Notifications activées
  - [ ] Son au scan QR
  - [ ] Vibration au tap NFC
  - [ ] Theme (light/dark/auto)
- [ ] Écran "À propos":
  - [ ] Version app
  - [ ] Licences open source
  - [ ] Contact support
- [ ] Animations Material Motion:
  - [ ] Transitions entre activities
  - [ ] Shared element transitions
  - [ ] Ripple effects
  - [ ] Loading states
- [ ] Améliorer parsing dates (SimpleDateFormat)
- [ ] Améliorer gestion erreurs
- [ ] Retry automatique réseau
- [ ] Offline mode basique (cache)
- [ ] Biometric auth optionnelle
- [ ] ProGuard rules pour release

**Temps estimé:** 3 heures

---

## ⏳ Phase 5: Tests & Debug

**Objectif:** Tests complets, fixes bugs, optimisation

**Statut:** Pas commencé

### Sous-tâches restantes

- [ ] Tests manuels flow complet
- [ ] Tests edge cases:
  - [ ] Pas de réseau
  - [ ] Token expiré
  - [ ] QR invalide
  - [ ] Permission refusée
  - [ ] NFC désactivé
  - [ ] Batterie faible
- [ ] Tests performance:
  - [ ] Memory leaks (LeakCanary)
  - [ ] ANRs
  - [ ] Crash logs
- [ ] Tests devices:
  - [ ] Android 8.0 (minSdk)
  - [ ] Android 13+ (Tap to Pay)
  - [ ] Différentes résolutions
  - [ ] Tablettes
- [ ] Optimisations:
  - [ ] ProGuard enable
  - [ ] R8 shrinking
  - [ ] Image optimization
  - [ ] APK size reduction
- [ ] Documentation:
  - [ ] User guide
  - [ ] Admin guide
  - [ ] Troubleshooting

**Temps estimé:** 4 heures

---

## 📦 Releases prévues

### v2.0.0-alpha (Phase 1) ✅
- Core architecture
- Login + Dashboard
- Scanner QR + Auto check-in
- **Statut:** Terminé (commit 881a477)

### v2.0.0-beta (Phase 2)
- Tap to Pay fonctionnel
- Paiements complets
- **Target:** À définir

### v2.0.0-rc1 (Phase 3+4)
- Stats réelles
- Historique
- Settings
- Polish UI
- **Target:** À définir

### v2.0.0 (Phase 5)
- Tests complets
- Production ready
- Play Store upload
- **Target:** À définir

---

## 🐛 Bugs connus

### Phase 1
1. **Date formatting** - ISO format brut, pas user-friendly
2. **Stats hardcodées** - Dashboard affiche "0" partout
3. **No offline** - Crash sans réseau
4. **Cookie plaintext** - SharedPreferences non chiffré
5. **No retry** - Pas de retry auto API calls

### À fixer Phase 2+
- [ ] Chiffrer SharedPreferences (EncryptedSharedPreferences)
- [ ] Retry logic OkHttp Interceptor
- [ ] Cache Room pour offline
- [ ] SimpleDateFormat pour dates

---

## 📝 Notes de développement

### Conventions code
- Java (pas Kotlin pour compatibilité legacy)
- Material Design 3
- ViewBinding (pas findViewById)
- OkHttp async callbacks (pas Retrofit pour simplicité)
- org.json (pas Moshi/Gson pour légèreté)

### Architecture
- Pas de MVVM/MVP (app trop simple)
- Activities directes
- Services API stateless
- SharedPreferences pour session
- Pas de Room Database (Phase 1)

### API Backend
- NextAuth credentials provider
- Cookies HttpOnly
- JWT dans session-token
- HTTPS only

---

## 🎯 Prochaine session

**Focus:** Phase 2 - Stripe Terminal Tap to Pay

**Checklist avant de commencer:**
1. Lire docs Stripe Tap to Pay Android
2. Créer compte test Stripe Terminal
3. Obtenir test card pour NFC
4. Préparer device Android 13+

**Première tâche:**
Créer `/api/mobile/payments/create-intent` backend Next.js

---

Dernière mise à jour: ${new Date().toLocaleDateString('fr-FR')}
