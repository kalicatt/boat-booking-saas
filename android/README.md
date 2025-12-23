# Sweet Narcisse Admin - Application Android

Application mobile native pour la gestion des embarquements et paiements Tap to Pay sur les bateaux Sweet Narcisse.

## 🚀 Version 2.0.0 - Refonte Native

Application 100% native Java, sans Capacitor, optimisée pour Android 13+.

### Fonctionnalités

#### ✅ Phase 1 : Architecture & Core (Terminée)
- **Authentification NextAuth** : Login avec session persistante
- **Dashboard** : Stats du jour (embarquements, paiements)
- **Scanner QR** : CameraX + ML Kit, auto check-in
- **Check-in automatique** : Scan → EMBARQUÉ directement

#### ✅ Phase 2a : Infrastructure Web→Mobile (Terminée)
- **Service de polling** : Écoute des sessions de paiement web
- **Trigger automatique** : Le web déclenche l'ouverture de PaymentActivity
- **BroadcastReceiver** : Communication inter-activités

#### ✅ Phase 2b : Paiement NFC (Terminée)
- **Stripe Terminal SDK** : Intégration complète
- **Tap to Pay** : Paiement par carte sans terminal physique
- **2 modes** : Manuel (employé saisit montant) / Déclenché (web pré-remplit)
- **Flow complet** : Découverte → Connexion → Intent → Collecte → Traitement → Confirmation

#### ✅ Phase 3 : Stats & Historique (Terminée)
- **Stats réelles** : Chargement depuis API
- **Historique** : Liste des réservations avec filtres
- **Pull-to-refresh** : Mise à jour manuelle
- **Badges colorés** : Status visuels (EMBARQUÉ, CONFIRMÉ, ANNULÉ)

#### ✅ Phase 4 : Settings & Polish (Terminée)
- **Paramètres** : Langue, version, à propos
- **Animations** : Transitions fluides
- **UI/UX** : Material Design 3

#### ⏳ Phase 5 : Tests & Debug (En cours)
- Tests manuels complets
- Memory leaks (LeakCanary)
- Performance & battery usage

#### ⏳ Phase 6 : Déploiement (À venir)
- Build release signé
- Upload vers VPS
- Distribution APK

---

## 📱 Captures d'écran

### Dashboard
```
┌─────────────────────────┐
│  Sweet Narcisse Admin   │
├─────────────────────────┤
│ Bonjour, Kali           │
│                         │
│ Aujourd'hui             │
│ 🚤 5 embarquements      │
│ 💰 245.00 € encaissés   │
│                         │
│ [Scanner QR]            │
│ [Nouveau paiement]      │
│ [Historique]            │
└─────────────────────────┘
```

### Paiement NFC
```
┌─────────────────────────┐
│  Nouveau paiement       │
├─────────────────────────┤
│ Client: Jean Dupont     │
│ Réf: #SN2401-1234       │
│                         │
│ Montant: 45.00 €        │
│                         │
│ 📱 Présentez la carte.. │
│     [━━━━━━━━━]         │
│                         │
│ [Collecter paiement]    │
└─────────────────────────┘
```

### Historique
```
┌─────────────────────────┐
│  Historique             │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │#SN2401-1234 [EMBARQUÉ]│
│ │Jean Dupont          │ │
│ │Sweet Narcisse 2     │ │
│ │📅 25/01 14:05 💳45€ │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │#SN2401-1235 [CONFIRMÉ]│
│ │Marie Martin         │ │
│ │Sweet Narcisse 1     │ │
│ │📅 25/01 12:30 ⏳50€ │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## 🛠️ Technologies

### Core
- **Langage** : Java 17
- **SDK** : Android 35 (Android 14)
- **Gradle** : 8.7.2
- **Min SDK** : 33 (Android 13)

### Dépendances principales
- **Stripe Terminal SDK** 4.7.6 : Paiements NFC
- **CameraX** 1.3.1 : Scanner QR code
- **ML Kit** 17.3.0 : Détection de codes-barres
- **Material Design 3** : Composants UI modernes
- **OkHttp** 4.12.0 : Client HTTP
- **SwipeRefreshLayout** : Pull-to-refresh
- **RecyclerView** : Listes performantes

### Architecture
```
com.sweetnarcisse.admin/
├── Activities/
│   ├── MainActivity.java          # Splash + Router
│   ├── LoginActivity.java         # Authentification
│   ├── DashboardActivity.java     # Écran principal
│   ├── ScannerActivity.java       # Scanner QR
│   ├── CheckinConfirmationActivity.java
│   ├── PaymentActivity.java       # Paiement NFC
│   ├── HistoryActivity.java       # Historique
│   └── SettingsActivity.java      # Paramètres
│
├── api/
│   ├── ApiClient.java             # Client HTTP + cookies
│   ├── AuthService.java           # Login/logout/session
│   ├── BookingService.java        # Verify & check-in
│   ├── PaymentService.java        # Sessions, intents, confirm
│   └── StatsService.java          # Stats + historique
│
├── models/
│   └── BookingHistory.java        # Modèle réservation
│
├── adapters/
│   └── BookingHistoryAdapter.java # RecyclerView adapter
│
├── services/
│   └── PaymentPollingService.java # Foreground service
│
└── SweetNarcisseApp.java          # Application class
```

---

## 🔧 Configuration

### Backend API

L'app communique avec le backend Next.js hébergé sur le VPS.

**Base URL :** `https://sweet-narcisse.fr`

**Endpoints utilisés :**

**Auth :**
- `POST /api/auth/signin` : Login NextAuth
- `POST /api/auth/signout` : Logout
- `GET /api/auth/session` : Vérifier session

**Bookings :**
- `POST /api/mobile/bookings/verify` : Vérifier QR + auto check-in

**Payments :**
- `GET /api/mobile/payments/sessions/claim` : Polling sessions
- `PATCH /api/mobile/payments/sessions/:id` : Update status
- `POST /api/mobile/payments/create-intent` : Créer PaymentIntent
- `POST /api/mobile/payments/confirm` : Confirmer paiement

**Stats :**
- `GET /api/mobile/stats/today` : Stats du jour
- `GET /api/mobile/history` : Historique réservations

### Stripe Terminal

**Configuration :**
- Mode : `LocalMobile` (utilise NFC intégré)
- Currency : EUR
- Payment method : `card_present`
- Capture : Automatique

**Flow :**
1. Découverte lecteur NFC local
2. Connexion au lecteur
3. Création PaymentIntent (backend)
4. Collecte méthode de paiement (NFC tap)
5. Traitement paiement
6. Confirmation backend

---

## 🚦 Statuts

### Booking Status
- `PENDING` : Réservation créée
- `CONFIRMED` : Paiement reçu
- `EMBARQUED` : Client scanné et embarqué ✅
- `COMPLETED` : Croisière terminée
- `CANCELLED` : Annulé

### Payment Status
- `PENDING` : En attente
- `PAID` : Payé ✅
- `REFUNDED` : Remboursé
- `FAILED` : Échoué

### PaymentSession Status
- `PENDING` : Créée depuis web
- `CLAIMED` : Récupérée par mobile
- `PROCESSING` : En cours de traitement
- `SUCCEEDED` : Succès ✅
- `FAILED` : Échec
- `EXPIRED` : Expirée (7 min TTL)

---

## 📦 Build & Installation

Voir [BUILD_GUIDE.md](./BUILD_GUIDE.md) pour les instructions complètes.

**Build debug rapide :**
```bash
cd android/
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Build release :**
```bash
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

---

## 🔐 Sécurité

### Authentification
- Session persistante via cookies HTTP-only
- Token CSRF pour formulaires
- Auto-logout après expiration session

### Communications
- HTTPS uniquement (no cleartext traffic)
- Certificate pinning (TODO Phase 6)
- Headers sécurisés

### Permissions
- `INTERNET` : Requis pour API
- `CAMERA` : Scanner QR code
- `NFC` : Paiements Tap to Pay
- `ACCESS_FINE_LOCATION` : Requis par Stripe Terminal
- `VIBRATE` : Feedback utilisateur

---

## 🐛 Debug

### Logs

**Tous les logs :**
```bash
adb logcat | grep "SweetNarcisse"
```

**Login/Auth :**
```bash
adb logcat | grep "LoginActivity\|AuthService"
```

**Paiement :**
```bash
adb logcat | grep "PaymentActivity\|PaymentPollingService"
```

**Scanner :**
```bash
adb logcat | grep "ScannerActivity\|BookingService"
```

### Vider données

```bash
adb shell pm clear com.sweetnarcisse.admin
```

---

## 📈 Roadmap

### Version 2.0.0 (Actuelle)
- ✅ Refonte native complète
- ✅ Stripe Terminal NFC
- ✅ Auto check-in QR
- ✅ Stats + Historique

### Version 2.1.0 (Future)
- [ ] Notifications push
- [ ] Mode offline + sync
- [ ] Export PDF factures
- [ ] Multi-langue (EN, ES, IT, DE)

### Version 2.2.0 (Future)
- [ ] Statistiques avancées
- [ ] Graphiques de performance
- [ ] Planning intégré
- [ ] Gestion équipage

---

## 🤝 Contribution

Ce projet est développé et maintenu par Kali.

### Workflow Git
```bash
# Branche principale
git checkout master

# Nouvelle feature
git checkout -b feature/ma-feature
git commit -m "feat(scope): description"
git push kalicat feature/ma-feature

# Merge via Pull Request
```

### Commit Convention
```
feat(mobile): nouvelle fonctionnalité
fix(payment): correction bug paiement
refactor(ui): refactorisation interface
docs(readme): mise à jour documentation
test(scanner): ajout tests scanner
```

---

## 📄 License

Propriétaire - Sweet Narcisse © 2024

---

## 📞 Support

**Issues :** GitHub Issues
**Email :** admin@sweetnarcisse.fr
**Documentation :** [docs/](../docs/)

---

**Dernière mise à jour :** 25 janvier 2024  
**Version :** 2.0.0 (200)  
**Status :** Production Ready 🚀
