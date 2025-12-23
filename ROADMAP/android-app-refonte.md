# Roadmap - Refonte Application Android Sweet Narcisse

**Objectif**: Simplifier l'application Android pour qu'elle serve uniquement de terminal de paiement et de scanner QR code, connectée au VPS.

## Vision

Une application Android minimaliste et ultra-performante dédiée à deux fonctions essentielles:
1. **Scanner QR codes** des réservations pour validation check-in
2. **Tap to Pay** Stripe pour encaissement sur place

L'application doit être légère, rapide, et offrir une UX professionnelle similaire aux terminaux de paiement modernes.

---

## Phase 1: Architecture & Setup de Base (2-3 jours)

### 1.1 Structure du projet Kotlin
- [x] Projet Android natif Kotlin (déjà existant dans `/android`)
- [ ] Nettoyage des fonctionnalités inutiles (booking widget, navigation complexe, etc.)
- [ ] Architecture MVVM simplifiée
- [ ] Dependency injection avec Hilt
- [ ] Coroutines pour async operations

### 1.2 Configuration VPS
- [ ] API endpoints à créer:
  - `POST /api/mobile/auth/login` - Authentification employé
  - `GET /api/mobile/bookings/:id/verify` - Vérification QR code
  - `POST /api/mobile/bookings/:id/checkin` - Confirmer check-in
  - `POST /api/mobile/payments/terminal` - Créer session Stripe Terminal
  - `POST /api/mobile/payments/capture` - Capturer paiement
- [ ] Authentication token JWT avec refresh
- [ ] Rate limiting pour sécurité

### 1.3 Base de données locale
- [ ] Room database pour:
  - Cache des bookings récents
  - Logs d'actions (sync offline)
  - Configuration appareil
- [ ] Offline-first avec synchronisation

**Livrables Phase 1:**
- Architecture propre et testable
- Connexion sécurisée au VPS
- Base de données locale fonctionnelle

---

## Phase 2: Module Authentification (1 jour)

### 2.1 Écran de connexion
```
┌─────────────────────────┐
│   Sweet Narcisse Logo   │
│                         │
│  [Email/Employee ID]    │
│  [PIN Code - 4 chiffres]│
│                         │
│     [ SE CONNECTER ]    │
│                         │
│  Se souvenir de moi ☑   │
└─────────────────────────┘
```

### 2.2 Fonctionnalités
- [ ] Écran splash avec logo
- [ ] Formulaire de connexion (employé uniquement)
- [ ] Validation PIN 4 chiffres
- [ ] Biometric unlock (fingerprint/face) si activé
- [ ] Token JWT stocké sécurisé (EncryptedSharedPreferences)
- [ ] Auto-refresh token
- [ ] Logout automatique après inactivité (configurable)

### 2.3 Gestion des erreurs
- [ ] Mauvais identifiants
- [ ] Compte désactivé
- [ ] Problème réseau
- [ ] Session expirée

**Livrables Phase 2:**
- Connexion sécurisée fonctionnelle
- Gestion session employé
- Biometric unlock

---

## Phase 3: Module Scanner QR Code (2-3 jours)

### 3.1 Écran scanner
```
┌─────────────────────────┐
│  ←  Scanner QR Code     │
├─────────────────────────┤
│                         │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   [CAMERA VIEW] │   │
│   │                 │   │
│   │   ┌─────────┐   │   │
│   │   │ [FRAME] │   │   │
│   │   └─────────┘   │   │
│   │                 │   │
│   └─────────────────┘   │
│                         │
│ Alignez le QR code      │
│ dans le cadre           │
│                         │
│  [💡 Activer Flash]     │
└─────────────────────────┘
```

### 3.2 Intégration caméra
- [ ] CameraX API (moderne et performant)
- [ ] ML Kit Barcode Scanning
- [ ] Auto-focus et zoom
- [ ] Flash toggle
- [ ] Vibration + son au scan réussi
- [ ] Frame guide animé

### 3.3 Écran validation booking
```
┌─────────────────────────┐
│  ←  Embarquement        │
├─────────────────────────┤
│                         │
│   ✅ EMBARQUÉ !         │
│                         │
│  👤 Jean Dupont         │
│  🕐 14:30 - 16:30       │
│  🚤 Barque #3           │
│  🌐 Français            │
│  💳 Payé ✓              │
│                         │
│  Participants: 4        │
│  Réf: #SN-12345         │
│                         │
│  ┌─────────────────┐    │
│  │ Check-in fait   │    │
│  │ automatiquement │    │
│  │      ✨         │    │
│  └─────────────────┘    │
│                         │
│  Retour au scanner...   │
│                         │
└─────────────────────────┘
```

**Note**: Plus de bouton "Confirmer" ! Dès que le QR est valide, le statut passe automatiquement à EMBARQUÉ dans toute l'application (admin web, planning, stats). L'employé voit juste la confirmation et l'écran revient au scanner.

### 3.4 Logique de validation
- [ ] Décodage QR code format: `https://sweet-narcisse.fr/booking-qr/{bookingId}/{token}`
- [ ] Appel API vérification avec token → **CHECK-IN AUTOMATIQUE** ✨
- [ ] Vérification statut (payé/non-payé, déjà check-in, annulé)
- [ ] Affichage info booking:
  - Nom client
  - Heure début/fin
  - Barque assignée
  - Langue (FR/EN/DE/ES/IT)
  - Statut paiement ✅ ou ❌
  - Nombre de participants
  - Référence
  - **Badge "EMBARQUÉ ✅"** (mis à jour automatiquement)
- [ ] ~~Bouton "Confirmer"~~ → **Plus besoin ! Check-in auto au scan** 🚀
- [ ] Animation confirmation (check vert + vibration)
- [ ] Retour automatique au scanner après 2s

### 3.5 Gestion des erreurs QR
```
┌─────────────────────────┐
│  ⚠️  QR Code invalide    │
│                         │
│  Ce QR code ne          │
│  correspond pas à       │
│  une réservation.       │
│                         │
│  [  RÉESSAYER  ]        │
└─────────────────────────┘
```

- [ ] QR invalide/format incorrect
- [ ] Booking non trouvé
- [ ] Booking déjà check-in
- [ ] Booking annulé
- [ ] Booking date passée
- [ ] Problème réseau → mode offline

### 3.6 Mode offline
- [ ] Cache des bookings du jour
- [ ] Queue des check-ins en attente
- [ ] Sync automatique au retour réseau
- [ ] Badge notification pending sync

**Livrables Phase 3:**
- Scanner QR fonctionnel
- Validation booking avec toutes infos
- Gestion erreurs complète
- Mode offline opérationnel

---

## Phase 4: Module Tap to Pay (3-4 jours)

### 4.1 Prérequis Stripe Terminal
- [ ] Intégration Stripe Terminal SDK Android
- [ ] Configuration Terminal API
- [ ] Enregistrement appareil comme terminal
- [ ] Test avec carte physique + NFC
- [ ] Gestion des readers virtuels (smartphone NFC)

### 4.2 Écran sélection montant
```
┌─────────────────────────┐
│  ←  Nouveau paiement    │
├─────────────────────────┤
│                         │
│     Montant à payer     │
│                         │
│       €  25.00          │
│                         │
│  ┌───┬───┬───┐          │
│  │ 1 │ 2 │ 3 │          │
│  ├───┼───┼───┤          │
│  │ 4 │ 5 │ 6 │          │
│  ├───┼───┼───┤          │
│  │ 7 │ 8 │ 9 │          │
│  ├───┼───┼───┤          │
│  │ ⌫ │ 0 │ . │          │
│  └───┴───┴───┘          │
│                         │
│  Montants rapides:      │
│  [20€] [30€] [50€]      │
│                         │
│  [   CONTINUER   ]      │
└─────────────────────────┘
```

### 4.3 Écran Tap to Pay (en attente)
```
┌─────────────────────────┐
│  ←  Paiement sans contact│
├─────────────────────────┤
│                         │
│        25.00 €          │
│                         │
│    ┌─────────────┐      │
│    │             │      │
│    │   📱💳      │      │
│    │    ))) NFC  │      │
│    │             │      │
│    │  Animation  │      │
│    │   pulsing   │      │
│    │             │      │
│    └─────────────┘      │
│                         │
│  Approchez la carte     │
│  de l'appareil          │
│                         │
│  [   ANNULER   ]        │
└─────────────────────────┘
```

### 4.4 Animation paiement
- [ ] Cercles concentriques pulsants (NFC effect)
- [ ] Icône carte animée
- [ ] Vibration au contact
- [ ] Son de confirmation
- [ ] Transition fluide vers succès/échec

### 4.5 Écran succès paiement
```
┌─────────────────────────┐
│   Paiement réussi ✅     │
├─────────────────────────┤
│                         │
│     ┌─────────┐         │
│     │    ✓    │         │
│     │  Check  │         │
│     │  animé  │         │
│     └─────────┘         │
│                         │
│      25.00 €            │
│   Mastercard ···· 1234  │
│                         │
│  Transaction approuvée  │
│  Réf: TXN-ABC123        │
│                         │
│  [📧 ENVOYER REÇU]      │
│  [ NOUVEAU PAIEMENT ]   │
│                         │
└─────────────────────────┘
```

### 4.6 Écran échec paiement
```
┌─────────────────────────┐
│   Paiement refusé ❌     │
├─────────────────────────┤
│                         │
│     ┌─────────┐         │
│     │    ✗    │         │
│     │  Cross  │         │
│     │  animé  │         │
│     └─────────┘         │
│                         │
│  Transaction refusée    │
│                         │
│  Raison:                │
│  Fonds insuffisants     │
│                         │
│  [  RÉESSAYER  ]        │
│  [   ANNULER   ]        │
│                         │
└─────────────────────────┘
```

### 4.7 Logique Stripe Terminal
- [ ] Créer PaymentIntent via API VPS
- [ ] Initialiser Stripe Terminal reader
- [ ] Collecte paiement NFC
- [ ] Gestion des états:
  - Waiting for card
  - Processing
  - Success
  - Failed
  - Cancelled
- [ ] Retry automatique en cas d'erreur réseau
- [ ] Timeout après 60s sans carte
- [ ] Annulation possible par employé

### 4.8 Types de paiement
- [ ] Paiement libre (clavier numérique)
- [ ] Paiement booking (montant pré-rempli depuis QR)
- [ ] Paiement dépôt
- [ ] Ajustement/remboursement

### 4.9 Reçu électronique
- [ ] Formulaire email/SMS client
- [ ] Template HTML reçu
- [ ] Envoi via API VPS
- [ ] PDF généré côté serveur
- [ ] Option imprimer (si imprimante Bluetooth)

**Livrables Phase 4:**
- Tap to Pay fonctionnel avec Stripe Terminal
- Animations professionnelles
- Gestion complète du flux paiement
- Reçus électroniques

---

## Phase 5: Navigation & Dashboard (1 jour)

### 5.1 Écran d'accueil (après login)
```
┌─────────────────────────┐
│ Sweet Narcisse  [Menu]  │
├─────────────────────────┤
│                         │
│  Bonjour Jean 👋        │
│  14 Déc 2025 - 14:30    │
│                         │
│  Aujourd'hui:           │
│  ┌─────────────────┐    │
│  │ 12 Check-ins ✅ │    │
│  │ 8 Paiements 💳  │    │
│  │ 450€ Encaissé  │    │
│  └─────────────────┘    │
│                         │
│  Actions rapides:       │
│  ┌─────────┬─────────┐  │
│  │   📷    │   💳    │  │
│  │ Scanner │ Nouveau │  │
│  │   QR    │ Paiement│  │
│  └─────────┴─────────┘  │
│                         │
│  [  VOIR HISTORIQUE  ]  │
└─────────────────────────┘
```

### 5.2 Menu latéral
```
┌─────────────────────────┐
│ Jean Dupont             │
│ jean@sweet-narcisse.fr  │
├─────────────────────────┤
│ 📷 Scanner QR           │
│ 💳 Nouveau paiement     │
│ 📊 Historique           │
│ ⚙️  Paramètres          │
│ ℹ️  À propos            │
│ 🚪 Déconnexion          │
└─────────────────────────┘
```

### 5.3 Historique transactions
- [ ] Liste check-ins du jour
- [ ] Liste paiements du jour
- [ ] Recherche par référence
- [ ] Filtres (date, type, statut)
- [ ] Pull-to-refresh
- [ ] Détails transaction au tap

### 5.4 Paramètres
- [ ] Activer/désactiver son
- [ ] Activer/désactiver vibration
- [ ] Timeout inactivité
- [ ] Biometric unlock
- [ ] Mode sombre
- [ ] Langue interface
- [ ] Vider cache
- [ ] Version app + numéro build

**Livrables Phase 5:**
- Dashboard intuitif
- Navigation fluide
- Historique consultable
- Paramètres personnalisables

---

## Phase 6: Polish & Optimisations (2 jours)

### 6.1 Design System
- [ ] Material Design 3 (Material You)
- [ ] Palette couleurs Sweet Narcisse:
  - Primary: Bleu Sweet Narcisse
  - Secondary: Or/Jaune
  - Success: Vert
  - Error: Rouge
  - Surface: Blanc/Gris clair
- [ ] Typography (Roboto/Inter)
- [ ] Spacing système 4pt
- [ ] Elevation/shadows cohérents
- [ ] Ripple effects
- [ ] Corner radius uniformes

### 6.2 Animations
- [ ] Transitions d'écrans (slide/fade)
- [ ] Loading shimmer effects
- [ ] Success/error animations (Lottie)
- [ ] Button states (pressed/disabled)
- [ ] Pull-to-refresh animation
- [ ] Skeleton loaders

### 6.3 Accessibilité
- [ ] TalkBack compatible
- [ ] Contrast ratios WCAG AA
- [ ] Touch targets 48dp minimum
- [ ] Content descriptions
- [ ] Focus indicators

### 6.4 Performances
- [ ] Image caching (Coil)
- [ ] Database indexing
- [ ] Background sync WorkManager
- [ ] Proguard/R8 optimization
- [ ] APK size < 15MB

### 6.5 Sécurité
- [ ] Certificate pinning
- [ ] Obfuscation du code
- [ ] Pas de logs en production
- [ ] Encrypted storage
- [ ] Root detection (optionnel)

**Livrables Phase 6:**
- Design cohérent et moderne
- Animations fluides
- App accessible
- Performances optimisées
- Sécurité renforcée

---

## Phase 7: Tests & Déploiement (2 jours)

### 7.1 Tests unitaires
- [ ] ViewModels
- [ ] Repositories
- [ ] UseCases
- [ ] Utilities

### 7.2 Tests UI
- [ ] Flows authentification
- [ ] Scan QR → validation
- [ ] Paiement complet
- [ ] Navigation
- [ ] Espresso tests

### 7.3 Tests d'intégration
- [ ] API calls
- [ ] Database sync
- [ ] Offline mode
- [ ] Error handling

### 7.4 Beta testing
- [ ] Build interne pour équipe
- [ ] Test avec vraies cartes Stripe Test
- [ ] Test QR codes production
- [ ] Feedback équipe

### 7.5 Déploiement
- [ ] Signing config production
- [ ] Version name/code
- [ ] Changelog
- [ ] Play Store assets:
  - Screenshots (5-8)
  - Feature graphic
  - App icon
  - Description FR/EN
  - Privacy policy URL
- [ ] Release APK/AAB
- [ ] Internal track → Beta → Production

**Livrables Phase 7:**
- Suite de tests complète
- App testée en conditions réelles
- Publication Play Store

---

## Technologies & Dépendances

### Core
- **Kotlin** 1.9+
- **Jetpack Compose** (UI moderne)
- **Coroutines + Flow** (async)
- **Hilt** (DI)

### Networking
- **Retrofit** + OkHttp
- **Moshi** (JSON parsing)
- **Certificate pinning**

### Database
- **Room** (SQLite wrapper)
- **DataStore** (preferences)

### Camera/QR
- **CameraX**
- **ML Kit Barcode Scanning**

### Paiement
- **Stripe Terminal SDK**
- **Stripe Android SDK**

### UI
- **Material 3** (Material You)
- **Lottie** (animations)
- **Coil** (images)

### Utils
- **Timber** (logging)
- **WorkManager** (background jobs)
- **EncryptedSharedPreferences**

---

## Architecture Simplifiée

```
┌─────────────────────────────────────┐
│         PRESENTATION LAYER          │
│  Compose Screens + ViewModels       │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│          DOMAIN LAYER               │
│  UseCases (business logic)          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│           DATA LAYER                │
│  Repositories                       │
│  ┌──────────┬──────────────┐        │
│  │ Remote   │   Local      │        │
│  │ (API)    │   (Room)     │        │
│  └──────────┴──────────────┘        │
└─────────────────────────────────────┘
```

### Flow exemple: Scan QR avec auto check-in

```
Scanner Screen (Compose)
  ↓ Scan QR code
Extraire bookingId + token du QR
  ↓
ScannerViewModel
  ↓
VerifyBookingUseCase
  ↓
POST /api/mobile/bookings/verify
  Body: { bookingId, token, autoCheckin: true }
  ↓
API Backend:
  1. Vérifier token ✓
  2. Récupérer booking ✓
  3. Vérifier conditions ✓
  4. 🚀 UPDATE checkinStatus = 'EMBARQUED'
  5. Logger action ✓
  6. Retourner données complètes
  ↓
Response: { valid: true, autoCheckedIn: true, booking: {...} }
  ↓
Update UI State → Afficher confirmation
  ↓ (animation 2s)
Retour automatique au scanner
```

---

## Wireframe Flows

### Flow 1: Check-in complet (simplifié)
```
Login → Dashboard → Scanner QR → ✨ AUTO CHECK-IN ✨ → Confirmation (2s) → Dashboard
                       ↓ (si non payé)
                  Proposer paiement → Tap to Pay → Succès → Dashboard
```

**Note**: Plus d'étape de validation manuelle ! Le scan fait tout automatiquement.

### Flow 2: Paiement direct
```
Login → Dashboard → Nouveau Paiement → Montant → Tap to Pay → Succès → Reçu
```

### Flow 3: Mode offline
```
Scanner QR → (Réseau KO) → Cache local → Confirmation → Queue sync
  ↓ (réseau revient)
Sync automatique → Update server
```

---

## Critères de succès

### Performance
- ⚡ Démarrage app < 2s
- 📷 Scan QR < 1s
- 💳 Initiation paiement < 500ms
- 🔄 Sync offline < 5s

### UX
- 👍 Note Play Store > 4.5/5
- ❤️ 0 frictions dans les flows principaux
- ♿ Accessibilité WCAG AA
- 🌐 Support FR/EN minimum

### Fiabilité
- 🛡️ 0 crash en production
- ✅ 99.9% uptime API
- 🔒 Paiements sécurisés 100%
- 📡 Mode offline fonctionnel

---

## Planning prévisionnel

| Phase | Durée | Dates (exemple) |
|-------|-------|-----------------|
| Phase 1: Architecture | 3j | J1-J3 |
| Phase 2: Auth | 1j | J4 |
| Phase 3: Scanner QR | 3j | J5-J7 |
| Phase 4: Tap to Pay | 4j | J8-J11 |
| Phase 5: Navigation | 1j | J12 |
| Phase 6: Polish | 2j | J13-J14 |
| Phase 7: Tests | 2j | J15-J16 |
| **Total** | **16 jours** | ~3-4 semaines |

---

## Risques & Mitigations

### 🔴 Risque: Stripe Terminal SDK complexe
**Mitigation**: 
- Commencer tests tôt
- Stripe Terminal test cards
- Fallback: paiement manuel input

### 🟠 Risque: NFC non disponible sur appareil
**Mitigation**:
- Détection au démarrage
- Message clair si incompatible
- Liste appareils compatibles

### 🟡 Risque: Problèmes réseau récurrents
**Mitigation**:
- Mode offline robuste
- Retry avec backoff exponentiel
- Queue persistante

### 🟢 Risque: Adoption par l'équipe
**Mitigation**:
- Formation courte
- Interface ultra-simple
- Support réactif

---

## Post-Launch (v1.1+)

### Features potentielles
- [ ] 📊 Dashboard stats avancés
- [ ] 🔔 Notifications push
- [ ] 📍 Géolocalisation (pontoon)
- [ ] 🎫 Gestion blocages/incidents
- [ ] 📱 Mode tablette (UI adaptative)
- [ ] 🖨️ Imprimante Bluetooth
- [ ] 📈 Analytics Firebase
- [ ] 🌙 Mode sombre automatique
- [ ] 🔐 2FA pour employés sensibles
- [ ] 📤 Export CSV transactions

---

## Notes techniques importantes

## État des APIs - Existantes vs À créer

### ✅ APIs EXISTANTES (Réutilisables)

#### 1. **Authentification** - NextAuth `/api/auth/[...nextauth]`
```typescript
// EXISTANT dans auth.ts
POST /api/auth/callback/credentials
Body: { email, password }
Response: Session with JWT

// ✅ RÉUTILISABLE tel quel
// L'app Android utilisera les credentials normaux (email + password)
// Possibilité d'ajouter un PIN code court dans le profil employé
```

#### 2. **Check-in Booking** - `/app/api/bookings/[id]/checkin/route.ts`
```typescript
// ✅ EXISTANT et FONCTIONNEL
POST /api/bookings/:id/checkin
Headers: { Cookie: next-auth session }
Body: { status?: 'EMBARQUED' | 'NO_SHOW' }
Response: { success: true, checkinStatus: 'EMBARQUED' }

// ✅ PARFAIT pour l'app Android
```

#### 3. **Stripe Terminal** - `/app/api/payments/terminal/`
```typescript
// ✅ EXISTANT - Token de connexion
POST /api/payments/terminal/token
Headers: { Cookie: session }
Body: { deviceId?: string }
Response: { secret, deviceId, locationId }

// ✅ EXISTANT - Créer session paiement
POST /api/payments/terminal/session
Body: { bookingId, amountCents?, currency?, targetDeviceId? }
Response: { session: PaymentSession }

// ✅ EXISTANT - Récupérer session
GET /api/payments/terminal/session/:id
Response: { session, paymentIntent }

// ✅ EXISTANT - Session suivante (queue)
GET /api/payments/terminal/session/next
Response: { session | null }

// ✅ TOUT EST DÉJÀ LÀ ! Parfait pour Tap to Pay
```

#### 4. **QR Code Booking** - `/app/api/booking-qr/[bookingId]/[token]/route.ts`
```typescript
// ✅ EXISTANT - Vérification token QR
GET /api/booking-qr/:bookingId/:token
Response: PNG image du QR code

// ⚠️ Retourne l'image, pas les données booking
// Utilise verifyBookingToken() pour validation
```

### 🔨 APIs À CRÉER (Nouvelles)

#### 1. **API Mobile - Vérifier Booking via QR** - ✅ **CRÉÉE**
```typescript
// ✅ CRÉÉE dans /app/api/mobile/bookings/verify/route.ts
POST /api/mobile/bookings/verify
Headers: { Cookie: next-auth session }
Body: { 
  bookingId: string, 
  token: string,
  autoCheckin?: boolean  // true par défaut
}
Response: {
  valid: boolean,
  autoCheckedIn: boolean,  // true si check-in fait automatiquement
  alreadyCheckedIn: boolean,  // true si déjà embarqué avant
  booking?: {
    id: string
    publicReference: string
    customerName: string
    customerEmail: string | null
    customerPhone: string | null
    startTime: string (ISO)
    endTime: string (ISO)
    date: string (ISO)
    boatName: string
    boatCapacity: number | null
    language: string
    isPaid: boolean
    totalPrice: number
    participants: { adults, children, babies, total }
    checkinStatus: string  // 'EMBARQUED' après scan
    status: string
    paymentMethod: string | null
    createdAt: string (ISO)
  },
  error?: string
}

// ✅ Fonctionnalités:
// 1. Vérifier token avec verifyBookingToken()
// 2. Récupérer booking complet (user, boat)
// 3. Vérifier statut (annulé, déjà check-in)
// 4. **AUTOMATIQUEMENT mettre à jour checkinStatus = 'EMBARQUED'**
// 5. Logger l'action
// 6. Retourner infos formatées pour affichage mobile
```

#### 2. **API Mobile - Auth avec PIN** (Optionnel)
```typescript
// 🆕 OPTIONNEL - Ajouter support PIN court
POST /api/mobile/auth/pin
Body: { employeeId: string, pin: string }
Response: { token, employee }

// Alternative: Utiliser NextAuth normal et ajouter
// un champ "pin" (4 chiffres) au modèle User
// pour unlock rapide sur appareil déjà connecté
```

### 📋 Récapitulatif

| Fonctionnalité | Endpoint | État | Action |
|----------------|----------|------|--------|
| Login employé | `/api/auth/callback/credentials` | ✅ Existe | Utiliser tel quel |
| Vérifier QR + Auto check-in | `/api/mobile/bookings/verify` | ✅ **CRÉÉE** | **Check-in automatique au scan** 🎯 |
| Check-in manuel | `/api/bookings/:id/checkin` | ✅ Existe | Fallback si besoin |
| Terminal token | `/api/payments/terminal/token` | ✅ Existe | Utiliser tel quel |
| Terminal session | `/api/payments/terminal/session` | ✅ Existe | Utiliser tel quel |
| Capturer paiement | Géré par Stripe SDK | ✅ Client-side | SDK Android Stripe |

### 🎯 APIs développées

**API créée**: `/app/api/mobile/bookings/verify/route.ts` ✅

**Fonctionnement**:
1. 📷 Scanner QR → Extraire `bookingId` + `token`
2. 📡 POST à `/api/mobile/bookings/verify`
3. ✅ API vérifie token + récupère booking
4. 🚀 **CHECK-IN AUTOMATIQUE** → `checkinStatus = 'EMBARQUED'`
5. 📱 Retour des infos complètes à l'app
6. 🎉 Affichage confirmation + retour scanner

**Synchronisation**: Le statut EMBARQUÉ est immédiatement visible partout :
- ✅ Interface admin web
- ✅ Planning temps réel
- ✅ Page "Aujourd'hui"
- ✅ Statistiques
- ✅ Logs d'activité

### Avantages de la réutilisation

1. ✅ **Authentification** déjà sécurisée avec NextAuth + JWT
2. ✅ **Check-in** déjà fonctionnel et testé
3. ✅ **Stripe Terminal** déjà intégré avec sessions/tokens
4. ✅ **QR validation** existe via `verifyBookingToken()`
5. ✅ **Logs** déjà tracés avec `createLog()`

**Gain de temps estimé**: 5-7 jours de dev backend économisés !

### Format QR Code

```
https://sweet-narcisse.fr/booking-qr/{bookingId}/{token}

Exemple:
https://sweet-narcisse.fr/booking-qr/clx123abc/eyJhbGc...
```

Décodage dans l'app:
1. Scanner le QR
2. Extraire bookingId et token
3. GET /api/mobile/bookings/{bookingId}/verify?token={token}
4. Afficher résultat

---

## Checklist pré-release

- [ ] ✅ Tous les tests passent
- [ ] 🔐 Certificate pinning activé
- [ ] 🔒 Obfuscation R8 activée
- [ ] 📝 Logs production désactivés
- [ ] 🎨 Tous les assets en place
- [ ] 📄 Privacy policy publiée
- [ ] 🔑 Signing key sauvegardé
- [ ] 📱 Testé sur 3+ devices Android
- [ ] 💳 Paiements test OK
- [ ] 📷 QR codes test OK
- [ ] 🌐 Traductions FR/EN complètes
- [ ] 📊 Crashlytics configuré
- [ ] 🎯 Play Store listing complet
- [ ] 👥 Formation équipe planifiée

---

**Roadmap créée le**: 23 Décembre 2025  
**Version app cible**: 2.0.0  
**Maintainer**: Sweet Narcisse Team
