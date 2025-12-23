# Phase 6 : Déploiement - Guide Complet

**Version :** 2.0.0 (200)  
**Date :** 25 janvier 2024  
**Status :** Ready for Deployment 🚀

---

## 📋 Pré-requis

### ✅ Checklist avant déploiement

- [ ] **Phase 5 terminée** : Tous tests passés, aucun bug bloquant
- [ ] **Version confirmée** : `build.gradle` versionCode=200, versionName="2.0.0"
- [ ] **Keystore créé** : `sweet-narcisse-release.keystore` disponible
- [ ] **keystore.properties configuré** : Passwords renseignés
- [ ] **Backend production opérationnel** : https://sweet-narcisse.fr accessible
- [ ] **Stripe Terminal configuré** : Mode production ou test selon besoin
- [ ] **Documentation à jour** : README, BUILD_GUIDE, REFONTE_COMPLETE

---

## 🔑 Configuration Keystore

### Étape 1 : Créer le keystore (si pas déjà fait)

```bash
cd android/

keytool -genkey -v -keystore sweet-narcisse-release.keystore \
  -alias sweet-narcisse \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Informations à fournir :**
- Password keystore : (choisir et NOTER)
- Password clé : (choisir et NOTER)
- Nom et prénom : Sweet Narcisse
- Unité organisationnelle : Admin
- Organisation : Sweet Narcisse
- Ville : (ville de l'entreprise)
- État/Province : (région)
- Code pays : FR

⚠️ **IMPORTANT :** Sauvegarder le keystore et les passwords dans un endroit sûr !

### Étape 2 : Créer keystore.properties

Créer le fichier `android/keystore.properties` :

```properties
storePassword=VOTRE_MOT_DE_PASSE_KEYSTORE
keyPassword=VOTRE_MOT_DE_PASSE_CLÉ
keyAlias=sweet-narcisse
storeFile=sweet-narcisse-release.keystore
```

⚠️ **Ne JAMAIS commit ce fichier !** (déjà dans .gitignore)

### Étape 3 : Vérifier build.gradle

Le fichier `android/app/build.gradle` doit contenir :

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('RELEASE_STORE_FILE')) {
                storeFile file(RELEASE_STORE_FILE)
                storePassword RELEASE_STORE_PASSWORD
                keyAlias RELEASE_KEY_ALIAS
                keyPassword RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 🏗️ Build Release

### Option A : Build APK (pour distribution directe)

```bash
cd android/

# Clean build
./gradlew clean

# Build APK release signé
./gradlew assembleRelease
```

**APK généré :**
```
android/app/build/outputs/apk/release/app-release.apk
```

**Vérifier signature :**
```bash
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```

✅ Doit afficher : `jar verified.`

### Option B : Build AAB (pour Google Play Store)

```bash
cd android/

# Build AAB release signé
./gradlew bundleRelease
```

**AAB généré :**
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📦 Vérification APK

### Taille APK

```bash
ls -lh app/build/outputs/apk/release/app-release.apk
```

✅ **Target :** < 15 MB

### Analyse APK

```bash
./gradlew analyzeReleaseBundle

# Ou avec Android Studio
Build → Analyze APK → sélectionner app-release.apk
```

**Vérifier :**
- Dépendances : Stripe Terminal, CameraX, OkHttp, Material
- ProGuard : classes obfusquées
- Resources : images optimisées
- Dex files : 1-2 fichiers max

### Test APK release

```bash
# Installer sur device physique
adb install app/build/outputs/apk/release/app-release.apk

# Ou avec -r pour remplacer
adb install -r app/build/outputs/apk/release/app-release.apk
```

**Tests critiques :**
- [ ] Login fonctionne
- [ ] Scanner QR fonctionne
- [ ] Paiement NFC fonctionne (mode test)
- [ ] Stats chargées
- [ ] Historique chargé
- [ ] Aucun crash

---

## 🌐 Déploiement VPS

### Étape 1 : Préparer le répertoire

SSH vers VPS :
```bash
ssh kali@91.134.174.90
```

Créer répertoire downloads :
```bash
cd /var/www/sweet-narcisse/public
mkdir -p downloads
chmod 755 downloads
```

### Étape 2 : Upload APK

Depuis machine locale :
```bash
scp android/app/build/outputs/apk/release/app-release.apk \
  kali@91.134.174.90:/var/www/sweet-narcisse/public/downloads/sweet-narcisse-admin-v2.0.0.apk
```

### Étape 3 : Vérifier upload

SSH VPS :
```bash
ls -lh /var/www/sweet-narcisse/public/downloads/sweet-narcisse-admin-v2.0.0.apk

# Vérifier permissions
chmod 644 /var/www/sweet-narcisse/public/downloads/sweet-narcisse-admin-v2.0.0.apk
```

### Étape 4 : Créer lien latest

```bash
cd /var/www/sweet-narcisse/public/downloads
ln -sf sweet-narcisse-admin-v2.0.0.apk sweet-narcisse-admin-latest.apk
```

### Étape 5 : Tester download

Depuis navigateur web :
```
https://sweet-narcisse.fr/downloads/sweet-narcisse-admin-latest.apk
```

✅ Doit télécharger l'APK

---

## 📱 Page de Téléchargement

### Créer page HTML (optionnel)

Créer `/var/www/sweet-narcisse/public/downloads/index.html` :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Narcisse Admin - Téléchargement</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
        }
        .download-btn {
            display: inline-block;
            background: #2196F3;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 18px;
            margin: 20px 0;
        }
        .version {
            color: #666;
            margin: 10px 0;
        }
        .qr-code {
            margin: 30px auto;
            max-width: 200px;
        }
    </style>
</head>
<body>
    <h1>🚤 Sweet Narcisse Admin</h1>
    <p class="version">Version 2.0.0 (200)</p>
    
    <a href="sweet-narcisse-admin-latest.apk" class="download-btn">
        📥 Télécharger l'application
    </a>
    
    <div class="qr-code">
        <!-- Générer QR code avec https://www.qr-code-generator.com/ -->
        <!-- URL : https://sweet-narcisse.fr/downloads/sweet-narcisse-admin-latest.apk -->
        <img src="qr-download.png" alt="QR Code" style="width: 100%;">
    </div>
    
    <h2>📋 Instructions</h2>
    <ol style="text-align: left;">
        <li>Télécharger l'APK</li>
        <li>Autoriser "Sources inconnues" dans les paramètres Android</li>
        <li>Installer l'application</li>
        <li>Se connecter avec vos identifiants admin</li>
    </ol>
    
    <h2>⚙️ Pré-requis</h2>
    <ul style="text-align: left;">
        <li>Android 13 ou supérieur</li>
        <li>NFC activé (pour paiements)</li>
        <li>Caméra (pour scanner QR)</li>
        <li>Connexion internet</li>
    </ul>
    
    <h2>📞 Support</h2>
    <p>Email : <a href="mailto:admin@sweetnarcisse.fr">admin@sweetnarcisse.fr</a></p>
</body>
</html>
```

**Générer QR code :**
1. Aller sur https://www.qr-code-generator.com/
2. URL : `https://sweet-narcisse.fr/downloads/sweet-narcisse-admin-latest.apk`
3. Télécharger PNG → renommer en `qr-download.png`
4. Upload sur VPS : `/var/www/sweet-narcisse/public/downloads/qr-download.png`

---

## 🏷️ Versioning Git

### Étape 1 : Tag version

```bash
cd sweet-narcisse/

# Tag version
git tag -a v2.0.0 -m "Release v2.0.0 - Refonte native complète

Features:
- Scanner QR + auto check-in
- Paiement NFC Stripe Terminal
- Web→Mobile trigger
- Stats temps réel + historique
- Documentation complète

Commits: Phase 0→4
Fichiers: 40+ créés, ~5000 lignes code
Status: Production Ready"

# Push tag
git push kalicat v2.0.0

# Push tous les tags
git push kalicat --tags
```

### Étape 2 : Créer GitHub Release

1. GitHub → Releases → "Draft a new release"
2. Tag : `v2.0.0`
3. Title : `v2.0.0 - Refonte Native`
4. Description :
```markdown
## 🚀 Sweet Narcisse Admin v2.0.0

Refonte complète de l'application Android en natif Java.

### ✨ Nouveautés

- ✅ Scanner QR avec auto check-in
- ✅ Paiement NFC Tap to Pay (Stripe Terminal)
- ✅ Trigger web→mobile automatique
- ✅ Stats temps réel
- ✅ Historique complet
- ✅ Architecture native (sans Capacitor)

### 📦 Téléchargement

- [sweet-narcisse-admin-v2.0.0.apk](https://sweet-narcisse.fr/downloads/sweet-narcisse-admin-latest.apk)

### 📋 Pré-requis

- Android 13+
- NFC activé
- Caméra

### 📄 Documentation

- [README](android/README.md)
- [BUILD_GUIDE](android/BUILD_GUIDE.md)
- [REFONTE_COMPLETE](android/REFONTE_COMPLETE.md)

---

**Version :** 2.0.0 (200)  
**Date :** 25/01/2024  
**Commits :** Phase 0→4 (9 commits)
```

5. Attach binary : Upload `app-release.apk`
6. Publish release

---

## 📱 Installation Utilisateur Final

### Guide pour employés

**Envoi par email :**
```
Objet : Nouvelle application Sweet Narcisse Admin v2.0.0

Bonjour,

La nouvelle version de l'application Sweet Narcisse Admin est disponible.

📥 Téléchargement :
https://sweet-narcisse.fr/downloads/sweet-narcisse-admin-latest.apk

Ou scanner ce QR code :
[Joindre image qr-download.png]

📋 Installation :
1. Télécharger l'APK sur votre téléphone Android
2. Ouvrir le fichier téléchargé
3. Si demandé, autoriser "Installer depuis des sources inconnues"
4. Cliquer "Installer"
5. Ouvrir l'app et se connecter avec vos identifiants

⚙️ Pré-requis :
- Android 13 minimum
- NFC activé (Paramètres → Appareils connectés → NFC)
- Connexion internet

🆘 Support :
admin@sweetnarcisse.fr

Merci,
L'équipe Sweet Narcisse
```

### Autoriser sources inconnues

**Android 13+ :**
1. Télécharger APK
2. Ouvrir fichier → popup "Cette application provient d'une source inconnue"
3. Clic "Paramètres" → activer "Autoriser depuis cette source"
4. Retour → clic "Installer"

**Android 12 et inférieur :**
1. Paramètres → Sécurité → Sources inconnues
2. Activer "Autoriser l'installation d'apps depuis des sources inconnues"
3. Télécharger et installer APK

---

## 🔄 Mises à jour futures

### Process de mise à jour

**1. Développement nouvelle version :**
- Incrémenter versionCode (201, 202, ...)
- Incrémenter versionName ("2.0.1", "2.1.0", ...)
- Develop + test

**2. Build release :**
```bash
./gradlew clean assembleRelease
```

**3. Upload VPS :**
```bash
scp app/build/outputs/apk/release/app-release.apk \
  kali@91.134.174.90:/var/www/sweet-narcisse/public/downloads/sweet-narcisse-admin-v2.X.X.apk
```

**4. Update lien latest :**
```bash
ssh kali@91.134.174.90
cd /var/www/sweet-narcisse/public/downloads
ln -sf sweet-narcisse-admin-v2.X.X.apk sweet-narcisse-admin-latest.apk
```

**5. Git tag :**
```bash
git tag -a vX.X.X -m "Release vX.X.X"
git push kalicat vX.X.X
```

**6. Notifier utilisateurs :**
- Email avec lien téléchargement
- Message dans app (si notification push implémenté v2.1)

---

## 🎯 Monitoring Post-Déploiement

### Backend logs

SSH VPS :
```bash
# Logs mobile API
sudo journalctl -u sweet-narcisse -f | grep "MOBILE_"

# Logs auth mobile
sudo journalctl -u sweet-narcisse -f | grep "mobile/auth"

# Logs paiements
sudo journalctl -u sweet-narcisse -f | grep "payment"
```

### Analytics

**Métrics à suivre :**
- Nombre de logins mobile / jour
- Nombre de check-ins via app / jour
- Nombre de paiements NFC / jour
- Taux de succès paiements (SUCCEEDED / total)
- Temps moyen paiement (create → confirm)
- Erreurs fréquentes (4XX, 5XX)

**Dashboard Prisma Studio :**
```bash
ssh kali@91.134.174.90
cd /var/www/sweet-narcisse
npx prisma studio

# Ouvrir tunnel SSH local
ssh -L 5555:localhost:5555 kali@91.134.174.90
```

Ouvrir : http://localhost:5555

**Queries utiles :**
```sql
-- Stats aujourd'hui
SELECT 
  COUNT(*) FILTER (WHERE "checkinStatus" = 'EMBARQUED') as check_ins,
  COUNT(*) FILTER (WHERE "paymentStatus" = 'PAID') as payments,
  SUM("totalPrice") FILTER (WHERE "paymentStatus" = 'PAID') as revenue
FROM "Booking"
WHERE DATE("date") = CURRENT_DATE;

-- Sessions paiement status
SELECT "status", COUNT(*) 
FROM "PaymentSession" 
WHERE DATE("createdAt") = CURRENT_DATE
GROUP BY "status";

-- Derniers paiements mobile
SELECT * FROM "DocumentAuditLog"
WHERE "action" = 'MOBILE_PAYMENT_SUCCESS'
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## 🐛 Rollback Plan

### En cas de bug critique en production

**1. Désactiver version actuelle :**
```bash
ssh kali@91.134.174.90
cd /var/www/sweet-narcisse/public/downloads
mv sweet-narcisse-admin-latest.apk sweet-narcisse-admin-v2.0.0-broken.apk
```

**2. Restaurer version précédente :**
```bash
# Si version 1.X.X existe
ln -sf sweet-narcisse-admin-v1.X.X.apk sweet-narcisse-admin-latest.apk

# Ou bloquer téléchargement
rm sweet-narcisse-admin-latest.apk
```

**3. Notifier utilisateurs :**
```
Objet : URGENT - Ne pas mettre à jour l'app

Un problème a été détecté sur la version 2.0.0.
Ne PAS mettre à jour l'application.
Si déjà installée, revenir à la version précédente.

Instructions : ...
```

**4. Fix bug :**
- Git revert ou fix
- Build nouvelle version (2.0.1)
- Tests exhaustifs
- Redéploiement

---

## ✅ Checklist Déploiement Final

### Avant déploiement
- [ ] Phase 5 tests complétée à 100%
- [ ] Aucun bug bloquant
- [ ] APK release signé généré
- [ ] APK testé sur device physique
- [ ] Documentation à jour
- [ ] CHANGELOG.md mis à jour

### Déploiement
- [ ] APK uploadé sur VPS
- [ ] Lien latest créé
- [ ] Page téléchargement publiée
- [ ] QR code généré
- [ ] Git tag créé et pushé
- [ ] GitHub Release publiée

### Post-déploiement
- [ ] Email envoyé aux employés
- [ ] Premier utilisateur testé installation
- [ ] Backend logs vérifiés (pas d'erreurs)
- [ ] Analytics configurées
- [ ] Monitoring actif

### Communication
- [ ] Équipe technique notifiée
- [ ] Employés formés (si nécessaire)
- [ ] Support email configuré
- [ ] Documentation accessible

---

## 📞 Support & Contacts

**Développeur :** Kali  
**Email technique :** admin@sweetnarcisse.fr  
**VPS :** 91.134.174.90 (kali@...)  
**GitHub :** kalicatt/SweetNarcisse-demo  
**Branch :** master

**En cas d'urgence :**
1. SSH VPS : rollback APK
2. Email support : notifier utilisateurs
3. GitHub Issues : reporter bug

---

**Dernière mise à jour :** 25 janvier 2024  
**Version app :** 2.0.0 (200)  
**Status :** Ready for Deployment 🚀
