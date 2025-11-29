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
* **Fichier concerné :** `app/admin/planning/page.tsx` [cite: kalicatt/sweetnarcisse-demo/kalicatt-SweetNarcisse-demo-e9264bd00c9a571fddd9ddff