# Guide de Build et Test - Application Android

## Version 2.0.0 - Refonte Native

### Prérequis

**Outils nécessaires :**
- Android Studio Hedgehog (2023.1.1) ou plus récent
- JDK 17
- Android SDK 35 (Android 14)
- Gradle 8.7.2 (inclus dans le projet)

**Appareil de test :**
- Android 13+ (SDK 33+)
- NFC activé pour les paiements Tap to Pay
- Caméra pour scanner QR codes

---

## 🏗️ Build APK de Développement

### 1. Ouvrir le projet

```bash
cd android/
```

Ouvrir le dossier `android/` dans Android Studio.

### 2. Synchroniser Gradle

File → Sync Project with Gradle Files

Attendre que toutes les dépendances soient téléchargées.

### 3. Build Debug APK

```bash
./gradlew assembleDebug
```

L'APK sera généré dans :
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. Installer sur appareil

**Via USB :**
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Via Android Studio :**
- Run → Run 'app'
- Sélectionner l'appareil connecté

---

## 📦 Build APK de Production

### 1. Configurer le Keystore

Créer un keystore si nécessaire :
```bash
keytool -genkey -v -keystore sweet-narcisse-release.keystore \
  -alias sweet-narcisse -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Créer `keystore.properties`

À la racine du projet `android/` :
```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE_CLÉ
keyAlias=sweet-narcisse
storeFile=../sweet-narcisse-release.keystore
```

⚠️ **Ne jamais commit ce fichier !** (déjà dans .gitignore)

### 3. Build Release APK

```bash
./gradlew assembleRelease
```

APK signé généré dans :
```
android/app/build/outputs/apk/release/app-release.apk
```

### 4. Build AAB (Google Play)

```bash
./gradlew bundleRelease
```

Bundle généré dans :
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## ✅ Tests Manuels

### Phase 1 : Authentification & Dashboard

**Login :**
1. Ouvrir l'app → écran de login
2. Email : `admin@sweetnarcisse.fr`
3. Password : (mot de passe admin)
4. Vérifier : redirection vers Dashboard
5. Vérifier : nom affiché "Bonjour, ..."
6. Vérifier : stats du jour chargées

**Stats Dashboard :**
1. Vérifier : "X embarquements"
2. Vérifier : "X.XX € encaissés (Y)"
3. Faire un check-in → revenir → stats mises à jour
4. Faire un paiement → revenir → stats mises à jour

### Phase 2a : Scan QR + Auto Check-in

**Scanner QR :**
1. Dashboard → "Scanner QR"
2. Autoriser la caméra
3. Scanner un QR code de réservation
4. Vérifier : écran de confirmation automatique
5. Vérifier : nom client, référence, bateau, créneau
6. Vérifier : status "EMBARQUÉ ✅"
7. Retour → stats mises à jour

### Phase 2b : Paiement NFC (Mode Manuel)

**Paiement manuel :**
1. Dashboard → "Nouveau paiement"
2. Entrer montant : 45.00
3. Clic "Collecter le paiement"
4. Vérifier : découverte terminal NFC
5. Vérifier : connexion établie
6. Vérifier : message "Présentez la carte..."
7. Présenter carte NFC
8. Vérifier : "Paiement réussi !"
9. Vérifier : auto-fermeture après 2s

### Phase 2b : Paiement NFC (Mode Déclenché Web)

**Trigger depuis web :**
1. Ouvrir planning web sur desktop
2. Sélectionner réservation
3. Clic "Créer réservation" → "paiement par carte"
4. Vérifier : notification sur téléphone Android
5. Vérifier : PaymentActivity s'ouvre automatiquement
6. Vérifier : montant pré-rempli + nom client + référence
7. Vérifier : status "PROCESSING"
8. Clic "Collecter le paiement"
9. Présenter carte NFC
10. Vérifier : "Paiement réussi !"
11. Vérifier : booking marqué PAID dans web admin
12. Vérifier : PaymentSession = SUCCEEDED

### Phase 3 : Historique

**Liste historique :**
1. Dashboard → "Historique"
2. Vérifier : liste des réservations (7 derniers jours)
3. Vérifier : badges colorés (EMBARQUÉ = vert, CONFIRMÉ = bleu)
4. Vérifier : icônes paiement (💳 = card, 💰 = cash, ⏳ = pending)
5. Pull-to-refresh → liste mise à jour
6. Vérifier : dates formatées "25/01/2024 14:05"
7. Vérifier : montants formatés "45.00 €"

### Phase 4 : Settings

**Paramètres :**
1. Dashboard → Menu (⋮) → "Paramètres"
2. Vérifier : langue affichée "Français"
3. Vérifier : version "2.0.0 (200)"
4. Vérifier : texte "À propos"

**Logout :**
1. Dashboard → Menu (⋮) → "Déconnexion"
2. Vérifier : redirection vers Login
3. Vérifier : impossible de revenir en arrière
4. Vérifier : session effacée

---

## 🐛 Debugging

### Logs en temps réel

```bash
adb logcat | grep -E "SweetNarcisse|LoginActivity|DashboardActivity|PaymentActivity|ScannerActivity"
```

### Logs spécifiques

**Auth :**
```bash
adb logcat | grep LoginActivity
```

**Paiement :**
```bash
adb logcat | grep -E "PaymentActivity|PaymentPollingService|PaymentService"
```

**Scanner :**
```bash
adb logcat | grep -E "ScannerActivity|BookingService"
```

### Vider le cache

```bash
adb shell pm clear com.sweetnarcisse.admin
```

---

## 📊 Tests de Performance

### Taille APK

```bash
./gradlew assembleRelease
ls -lh app/build/outputs/apk/release/app-release.apk
```

Objectif : < 15 MB

### Memory Leaks

Installer LeakCanary (déjà inclus en mode debug) :
- Ouvrir l'app
- Naviguer entre activities
- Vérifier : pas de notification LeakCanary

### Battery Usage

1. Laisser l'app en background 1h
2. Settings → Battery → App usage
3. Vérifier : consommation < 1% (service polling)

---

## 🚀 Déploiement VPS

### 1. Copier l'APK vers le VPS

```bash
scp app/build/outputs/apk/release/app-release.apk \
  kali@91.134.174.90:/var/www/sweet-narcisse/public/downloads/
```

### 2. Téléchargement sur appareil

Sur le téléphone Android :
- Ouvrir navigateur
- URL : https://sweet-narcisse.fr/downloads/app-release.apk
- Installer (autoriser sources inconnues si nécessaire)

---

## 📱 Configuration NFC

**Stripe Terminal Local Mobile Reader :**

L'app utilise le lecteur NFC intégré au téléphone via Stripe Terminal SDK.

**Configuration :**
1. Téléphone doit avoir NFC activé
2. Android 13+ requis
3. Permissions accordées : NFC, LOCATION
4. Stripe Terminal SDK 4.7.6 configuré

**Test NFC :**
```bash
adb shell dumpsys nfc
```

Vérifier : `mState=STATE_ON`

---

## 🔧 Troubleshooting

### Problème : Gradle sync échoue

**Solution :**
```bash
./gradlew clean
./gradlew --refresh-dependencies
```

### Problème : Camera permission denied

**Solution :**
Settings → Apps → Sweet Narcisse → Permissions → Caméra → Autoriser

### Problème : NFC ne détecte pas

**Solutions :**
1. Vérifier NFC activé : Settings → Connected devices → Connection preferences → NFC
2. Vérifier permission LOCATION accordée
3. Redémarrer l'app
4. Vérifier : `adb shell dumpsys nfc`

### Problème : Service de polling ne démarre pas

**Solution :**
```bash
adb logcat | grep PaymentPollingService
```

Vérifier : "Service de polling démarré"

Si non, redémarrer l'app ou vider le cache.

### Problème : Login échoue

**Solutions :**
1. Vérifier connexion internet
2. Vérifier serveur : https://sweet-narcisse.fr/api/auth/signin
3. Vérifier cookies : `adb logcat | grep ApiClient`
4. Tester credentials sur web

---

## 📝 Checklist Release

Avant chaque release :

- [ ] Tests manuels complets (toutes phases)
- [ ] Vérifier version dans `build.gradle` (versionCode, versionName)
- [ ] Build release APK signé
- [ ] Tester APK release sur appareil physique
- [ ] Vérifier taille APK (< 15 MB)
- [ ] Vérifier aucune donnée de test en dur
- [ ] Push vers VPS
- [ ] Tag Git : `git tag -a v2.0.0 -m "Release 2.0.0"`
- [ ] Push tags : `git push kalicat --tags`

---

## 📚 Ressources

**Documentation :**
- [Android Developer Guide](https://developer.android.com)
- [Stripe Terminal Android SDK](https://stripe.com/docs/terminal/sdk/android)
- [Material Design 3](https://m3.material.io)
- [CameraX Documentation](https://developer.android.com/training/camerax)

**Dépendances clés :**
- Stripe Terminal SDK: 4.7.6
- CameraX: 1.3.1
- ML Kit: 17.3.0
- Material Design: 1.12.0
- OkHttp: 4.12.0
