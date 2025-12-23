# CHANGELOG - Android App

## [2.0.0] - Phase 1 - 2024

### 🎉 Refonte complète: Capacitor → Android Native

**Migration majeure:** Passage d'une WebView Capacitor à une application Android native Java légère.

### ✨ Nouveautés

#### Architecture
- **Application class** `SweetNarcisseApp` avec initialisation Stripe Terminal
- **Router intelligent** `MainActivity` (splash → login/dashboard selon auth)
- **ViewBinding** activé pour tous les layouts (type-safe)

#### Authentification
- Écran login Material Design 3
- Intégration **NextAuth credentials provider**
- Gestion cookies `next-auth.session-token` automatique
- Session persistée SharedPreferences
- Gestion erreurs: 401 (bad credentials), 403 (disabled), network

#### Dashboard
- Message bienvenue personnalisé
- Card statistiques du jour (check-ins, paiements)
- 3 boutons actions rapides:
  - Scanner QR Code
  - Nouveau paiement  
  - Historique
- Menu toolbar: Paramètres, Déconnexion

#### Scanner QR Code
- **CameraX** preview plein écran
- **ML Kit** barcode scanning (QR_CODE format)
- Overlay visée blanc centré
- Parsing automatique URL réservation
- **Auto check-in** via `/api/mobile/bookings/verify`
- Gestion permissions runtime

#### Confirmation Check-in
- Badge "✅ EMBARQUÉ" vert
- Détails réservation:
  - Client, horaire, bateau
  - Participants, langue
- **Auto-retour scanner après 3 secondes**
- Boutons manuels: Nouveau scan, Dashboard

#### API Layer
- **ApiClient** singleton OkHttpClient
  - Cookie interceptor NextAuth
  - Logging interceptor (debug)
  - Timeouts 30s
- **AuthService**: login, logout, getSession
- **BookingService**: verifyAndCheckin
- Models: LoginRequest/Response, BookingResponse

#### UI/UX
- Material Design 3 partout
- Theme AppTheme avec couleurs brand
- TextInputLayouts outlined
- MaterialButtons avec icônes
- MaterialCardViews avec elevation
- Splash screen Android 12+
- Animations Material

### 🔧 Changements techniques

#### Build Configuration
- **compileSdk:** 35 (Android 15)
- **minSdk:** 26 (Android 8.0)
- **targetSdk:** 35
- **Java:** 17 (sourceCompatibility/targetCompatibility)
- **versionCode:** 200
- **versionName:** "2.0.0"
- **ViewBinding:** enabled

#### Dépendances ajoutées
```
androidx.camera:camera-* 1.3.1
com.google.mlkit:barcode-scanning 17.3.0
com.stripe:stripeterminal 4.7.6
com.google.android.material 1.11.0
androidx.lifecycle:lifecycle-* 2.8.7
com.squareup.okhttp3:okhttp 4.12.0
androidx.constraintlayout 2.1.4
```

#### Dépendances supprimées
```
com.getcapacitor:* (toutes)
cordova-* (toutes)
```

### 🗑️ Suppressions

**Fichiers supprimés:**
- `TapToPayApplication.java` → Remplacé par `SweetNarcisseApp`
- `overlays/ScannerOverlayView.java` → Remplacé par CameraX natif
- `tap2pay/TapToPayManager.java` → Sera réimplémenté Phase 2

**Capacitor supprimé:**
- WebView framework complet
- Bridge JS/Native
- Plugins Cordova

### 🔐 Sécurité

- HTTPS only (`usesCleartextTraffic=false`)
- Cookies HttpOnly NextAuth
- Session private SharedPreferences
- Runtime permissions CAMERA
- Token JWT dans cookies

### 📊 Statistiques

- **25 fichiers** modifiés
- **+1979 lignes** ajoutées
- **-1097 lignes** supprimées
- **18 fichiers** créés
- **3 fichiers** supprimés

### 📱 Permissions

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.NFC" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

### 🐛 Bugs connus / Limitations

1. **Stats Dashboard** - Valeurs hardcodées "0" (API Phase 3)
2. **Date formatting** - Format ISO brut (SimpleDateFormat Phase 4)
3. **PaymentActivity** - Stub uniquement (Stripe Phase 2)
4. **Offline mode** - Pas de cache (Room Phase 4)
5. **No retry** - Pas de retry automatique network (Phase 4)
6. **Settings** - Pas encore implémenté (Phase 4)
7. **Historique** - Pas encore implémenté (Phase 3)

### 🚀 Prochaine version: v2.0.0-beta (Phase 2)

**Focus:** Stripe Terminal Tap to Pay

- [ ] Payment Intent création
- [ ] Reader discovery (LocalMobile)
- [ ] NFC collect payment
- [ ] Confirmation paiement
- [ ] Reçu/Receipt

### 📝 Migration Notes

**Pour migrer depuis v1.x (Capacitor):**

1. **Désinstaller** ancienne app
2. **Installer** nouvelle APK v2.0.0
3. **Se reconnecter** avec credentials employé
4. **Accepter** permission caméra

**Pas de migration automatique** - Clean install requise

---

## [1.x] - Anciennes versions Capacitor

### [1.0.0] - Initial Capacitor WebView
- WebView Ionic/Capacitor
- Interface web embarquée
- Scanner QR basique
- Tap to Pay version 1

**Deprecated** - Remplacé par v2.0.0 native

---

**Format:** [Keep a Changelog](https://keepachangelog.com/)  
**Versioning:** [Semantic Versioning](https://semver.org/)
