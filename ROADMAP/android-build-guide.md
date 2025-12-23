# Guide de Build & Test - Android App v2.0.0

## 🏗️ Build de l'application

### Prérequis

- **Android Studio** Hedgehog (2023.1.1) ou plus récent
- **JDK 17** (OpenJDK recommandé)
- **Android SDK:**
  - SDK Platform 35 (Android 15)
  - SDK Build Tools 34.0.0
  - SDK Platform-Tools
- **Device Android physique** (pour tester NFC/Camera)
  - Minimum: Android 8.0 (API 26)
  - Recommandé: Android 13+ pour Tap to Pay

### Configuration initiale

1. **Ouvrir le projet dans Android Studio**
   ```bash
   cd "e:\SWEET NARCISSE\sweet-narcisse"
   # Ouvrir android/ dans Android Studio
   ```

2. **Sync Gradle**
   - Android Studio > File > Sync Project with Gradle Files
   - Attendre téléchargement des dépendances

3. **Vérifier configuration Java**
   - File > Project Structure
   - SDK Location > JDK: vérifier Java 17

### Build Debug APK

#### Via Android Studio GUI

1. Build > Build Bundle(s) / APK(s) > Build APK(s)
2. Attendre fin compilation
3. APK généré: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Via ligne de commande

```powershell
cd "e:\SWEET NARCISSE\sweet-narcisse\android"

# Build debug APK
.\gradlew assembleDebug

# APK sera dans:
# app\build\outputs\apk\debug\app-debug.apk
```

### Build Release APK (Production)

```powershell
# Générer keystore (première fois seulement)
keytool -genkey -v -keystore sweetnarcisse.keystore -alias sweetnarcisse -keyalg RSA -keysize 2048 -validity 10000

# Build release signé
.\gradlew assembleRelease

# APK sera dans:
# app\build\outputs\apk\release\app-release.apk
```

**Note:** Pour release, il faut configurer le keystore dans `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("sweetnarcisse.keystore")
            storePassword "votre_password"
            keyAlias "sweetnarcisse"
            keyPassword "votre_password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

## 📱 Installation sur device

### Via USB (ADB)

1. **Activer mode développeur** sur Android:
   - Paramètres > À propos
   - Taper 7x sur "Numéro de build"

2. **Activer débogage USB:**
   - Paramètres > Options développeur
   - Activer "Débogage USB"

3. **Connecter device via USB**

4. **Installer APK:**
   ```powershell
   cd "e:\SWEET NARCISSE\sweet-narcisse\android"
   
   # Vérifier device connecté
   adb devices
   
   # Installer app
   adb install -r app\build\outputs\apk\debug\app-debug.apk
   
   # Ou directement depuis Android Studio:
   # Run > Run 'app'
   ```

### Via fichier APK direct

1. Transférer `app-debug.apk` sur le téléphone
2. Ouvrir avec gestionnaire de fichiers
3. Installer (autoriser "Sources inconnues" si demandé)

## 🧪 Tests manuels

### 1. Premier lancement

✅ **Vérifier:**
- Splash screen s'affiche
- Redirection automatique vers LoginActivity
- Logo et formulaire login visibles
- Clavier apparaît au focus sur email

### 2. Test authentification

#### Credentials de test

Utiliser un employé existant de la base de données:

```
Email: employe@sweetnarcisse.fr
Password: [votre_password_employé]
```

✅ **Vérifier:**
- Saisie email/password
- Clic "Se connecter" → ProgressBar visible
- Connexion réussie → Redirection dashboard
- Erreur 401 → Message "Email ou mot de passe incorrect"
- Erreur réseau → Message "Erreur réseau"

### 3. Test Dashboard

✅ **Vérifier:**
- Message "Bonjour, [prénom]" affiché
- Card statistiques visible (0 pour l'instant)
- 3 boutons actions rapides présents
- Menu (3 points) → Paramètres, Déconnexion
- Clic "Scanner QR" → Ouvre ScannerActivity

### 4. Test Scanner QR

⚠️ **Permission caméra requise**

✅ **Vérifier:**
- Popup permission caméra s'affiche
- Accepter → Preview caméra démarre
- Overlay blanc (cadre) visible au centre
- Instructions en haut

#### Générer QR de test

Sur le backend Next.js, dans l'admin, créer une réservation de test et afficher son QR code, ou utiliser:

```
URL: https://sweet-narcisse.fr/booking/{BOOKING_ID}?token={JWT_TOKEN}
```

✅ **Scanner le QR et vérifier:**
- Détection automatique
- Toast "Vérification..." ou redirection immédiate
- Si valide → CheckinConfirmationActivity
- Si invalide → Toast "QR Code invalide"

### 5. Test Confirmation Check-in

✅ **Vérifier:**
- Badge "✅ EMBARQUÉ" en vert
- Nom client affiché
- Horaire formaté correctement
- Bateau, participants, langue affichés
- Bouton "Nouveau scan" fonctionne
- Bouton "Retour dashboard" fonctionne
- **Auto-retour après 3s** vers scanner

#### Vérifier backend

Sur le VPS, vérifier que le status a changé:

```sql
SELECT id, customerName, checkinStatus 
FROM Booking 
WHERE id = '{BOOKING_ID}';

-- checkinStatus doit être 'EMBARQUED'
```

### 6. Test Déconnexion

✅ **Vérifier:**
- Dashboard > Menu > Déconnexion
- Redirection LoginActivity
- Session effacée (relancer app → login requis)

### 7. Test Paiement (stub)

✅ **Vérifier:**
- Dashboard > "Nouveau paiement"
- Écran placeholder s'affiche
- Toast "Tap to Pay - À implémenter"

## 🐛 Debugging

### Voir les logs Android

```powershell
# Logs en temps réel
adb logcat | Select-String "SweetNarcisse"

# Filtrer par tag
adb logcat -s LoginActivity:D
adb logcat -s ScannerActivity:D
adb logcat -s ApiClient:D
```

### Logs importants

```
LoginActivity: Connexion réussie
ApiClient: Response: 200, Body: {...}
ScannerActivity: QR Code détecté: https://...
BookingService: Check-in effectué pour booking: xxx
```

### Erreurs communes

#### 1. `ClassNotFoundException: SweetNarcisseApp`
**Solution:** Clean & Rebuild
```powershell
.\gradlew clean
.\gradlew assembleDebug
```

#### 2. `Failed to resolve: androidx.camera:camera-core:1.3.1`
**Solution:** Vérifier connexion internet, sync Gradle

#### 3. `Permission denied: CAMERA`
**Solution:** Vérifier AndroidManifest.xml, demander runtime permission

#### 4. `SSLHandshakeException`
**Solution:** Vérifier certificat HTTPS du serveur

#### 5. `NetworkOnMainThreadException`
**Solution:** Déjà géré avec OkHttp async callbacks

## 🔍 Vérification checklist

Avant de considérer Phase 1 testée:

- [ ] Build gradle sans erreur
- [ ] APK installable sur device
- [ ] Login fonctionne avec NextAuth
- [ ] Cookies session sauvegardés
- [ ] Dashboard affiche nom utilisateur
- [ ] Scanner demande permission caméra
- [ ] QR code détecté et parsé
- [ ] API `/api/mobile/bookings/verify` appelée
- [ ] Status EMBARQUED enregistré backend
- [ ] Confirmation affiche détails réservation
- [ ] Auto-retour scanner après 3s
- [ ] Déconnexion efface session
- [ ] Relancement app → login requis si déconnecté
- [ ] Relancement app → dashboard si connecté

## 📊 Performance attendue

### Build times
- Clean build: ~3-5 minutes
- Incremental build: ~30-60 secondes

### App size
- APK debug: ~15-20 MB
- APK release (minified): ~8-12 MB

### Runtime
- Cold start: <2 secondes
- Scanner → Confirmation: <1 seconde
- Login API call: 200-500ms

## 🚨 Problèmes connus Phase 1

1. **Date formatting** - Format brut ISO, pas de SimpleDateFormat
2. **Stats hardcodées** - Dashboard affiche "0" partout
3. **No offline mode** - Crash sans réseau
4. **No error retry** - Pas de retry automatique API
5. **Cookie persistence** - SharedPreferences non chiffré

## 🎯 Prochains tests (Phase 2)

- [ ] Stripe Terminal initialization
- [ ] NFC reader discovery
- [ ] Payment processing
- [ ] Receipt generation
- [ ] Historique pagination
- [ ] Settings persistence
- [ ] Biometric auth

---

**Questions/Problèmes:** Créer une issue GitHub ou contacter le dev
