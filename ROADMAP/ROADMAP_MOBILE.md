# Roadmap Mobile : Sweet Narcisse Admin (Capacitor)

Ce document détaille le plan de transformation de l'interface d'administration Next.js existante en une application mobile native (iOS/Android) pour le staff, incluant un système de scan de billets rapide ("Scan & Go").

---

## 📅 Phase 1 : Fondations & Configuration Mobile
**Objectif :** Rendre le projet "hybride" (Web + Mobile) sans casser l'existant.

### 1. Installation du Moteur (Capacitor)
Transformer le projet web en projet natif.
* **Commandes :**
    ```bash
    npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
    npx cap init SweetNarcisseAdmin com.sweetnarcisse.admin
    npx cap add ios
    npx cap add android
    ```
* **Fichier concerné :** `package.json`

### 2. Intégration UI Mobile (Konsta UI)
Pour un look 100% natif (iOS/Material) avec Tailwind.
* **Installation :** `npm install konsta`
* **Configuration :** Modifier `tailwind.config.cjs` pour inclure les variantes Konsta.
* **Fichier concerné :** `tailwind.config.cjs`

### 3. Gestion des Safe Areas (Encoches)
Gérer les barres de navigation et les encoches des téléphones récents.
* **Installation :** `npm install tailwindcss-safe-area`
* **Configuration :** Ajouter le plugin dans Tailwind et définir `viewport-fit=cover` dans les métadonnées de l'app.
* **Fichier concerné :** `app/layout.tsx`

---

## 🧭 Phase 2 : Navigation & Architecture UI
**Objectif :** Remplacer la Sidebar Desktop par une TabBar Mobile.

### 1. Création du Layout Mobile
* **Nouveau composant :** `app/admin/_components/MobileAdminLayout.tsx`
* **Contenu :** Utiliser `<Page>` et `<Toolbar>` (Konsta UI) pour créer une barre d'onglets fixe en bas.
* **Liens :** Aujourd'hui, Planning, Réservations, Stats.

### 2. Switch Intelligent (Desktop vs Mobile)
* **Logique :** Détecter la plateforme native pour servir le bon layout.
* **Code :** Dans `app/admin/layout.tsx`, utiliser un hook ou `Capacitor.isNativePlatform()` pour choisir entre `AdminPageShell` (Desktop) et `MobileAdminLayout` (Mobile).
* **Fichiers concernés :** * `app/admin/layout.tsx`
    * `app/admin/_components/AdminPageShell.tsx`

---

## 📱 Phase 3 : Adaptation des Modules Admin
**Objectif :** Rendre les données lisibles et tactiles.

### 1. Module "Aujourd'hui" (Dashboard Terrain)
* **Transformation :** Convertir le tableau Desktop en une **Liste de Cartes**.
* **UI :** Grossir les textes (Heure, Nom), ajouter des badges de statut colorés.
* **Fichier concerné :** `app/admin/today/page.tsx`

### 2. Module "Planning"
* **Transformation :** Passer d'une vue Calendrier Grille à une vue **Agenda Vertical** (Timeline).
* **Fichier concerné :** `app/admin/planning/page.tsx`

### 3. Module "Employés" (Pointage)
* **Feature :** Géolocalisation obligatoire au pointage.
* **Outil :** `@capacitor/geolocation`
* **Fichier concerné :** `app/admin/hours/page.tsx`

---

## 🚀 Phase 4 : Feature Star "Scan & Go"
**Objectif :** Embarquement ultra-rapide par QR Code.

### 1. Backend : Génération QR Code
* **Action :** Intégrer un QR Code (contenant le `bookingId`) dans l'email de confirmation.
* **Outil :** Librairie `qrcode`.
* **Fichier concerné :** `components/emails/BookingTemplate.tsx`

### 2. Frontend Mobile : Scanner & Haptique
* **UI :** Ajouter un **FAB (Floating Action Button)** caméra dans le module "Aujourd'hui".
* **Logique :**
    1.  Ouvrir caméra (`@capacitor-mlkit/barcode-scanning`).
    2.  Au scan, appeler l'API de Check-in.
    3.  Succès = Vibration lourde (`@capacitor/haptics`) + Écran Vert.
    4.  Erreur = Vibration double + Écran Rouge.

### 3. API : Route Fast Check-in
* **Nouvelle Route :** `app/api/bookings/[id]/checkin/route.ts`
* **Action :** Mettre à jour `checkinStatus` vers `EMBARQUED` dans Prisma.

---

## 💎 Phase 5 : Finitions & Biométrie
**Objectif :** Une expérience fluide sans mot de passe répété.

### 1. Option "Se souvenir de moi"
* **Feature :** Proposer une case à cocher pour conserver la session du staff.
* **Logique :** Stocker un refresh token ou un cookie persistant via Capacitor Storage de façon sécurisée.
* **Fichiers concernés :** `app/login/page.tsx`, `lib/auth.ts`

### 2. Branding Natif
* **Status Bar :** `@capacitor/status-bar` appliqué via `components/NativeBrandingInitializer.tsx` pour un fond `#0f172a` et un contenu clair.
* **Splash Screen :** Assets régénérés (`scripts/update-splash-assets.js`) avec logo centré sur fond `#0f172a` + storyboard teinté.
* **Icône d'app :** `scripts/update-native-icons.js` produit les ressources Android/iOS (logo + fond brandé).

---

## 📦 Phase 6 : Build & Déploiement
**Objectif :** Mettre l'app dans la poche du staff.

1.  **Build Web :** `npm run build`
2.  **Synchro Mobile :** `npx cap sync`
3.  **Compilation Native :**
    * **iOS :** `npx cap open ios` (Xcode)
    * **Android :** `npx cap open android` (Android Studio)
4.  **Distribution :** Via TestFlight (iOS) ou APK direct (Android).