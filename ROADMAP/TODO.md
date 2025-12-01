## 🚨 High Priority: Mobile & POS Transformation
**Objectif :** Rendre l'admin utilisable sur le terrain et activer l'encaissement physique.

### Mobile Architecture (Capacitor) [ROADMAP_MOBILE]
- [x] **Init:** Installer Capacitor (iOS/Android) et initialiser le projet (`npx cap init`).
- [x] **UI:** Installer Konsta UI et configurer `tailwind.config.cjs`.
- [x] **Safe Areas:** Ajouter `tailwindcss-safe-area` et `viewport-fit=cover`.
- [x] **Layout:** Créer `MobileAdminLayout.tsx` avec TabBar (Aujourd'hui, Planning, Réservations).
- [x] **Logic:** Implémenter le switch automatique Desktop/Mobile dans `app/admin/layout.tsx`.
- [ ] **Views:** Adapter la vue "Aujourd'hui" (Liste de cartes) et "Planning" (Agenda vertical).

### POS & Payments (Stripe Terminal) [ROADMAP_POS]
- [ ] **Backend:** Configurer Stripe Terminal (Location ID) et créer la route `/api/payments/terminal/token`.
- [ ] **Data:** Mettre à jour `app/api/bookings/route.ts` pour supporter les métadonnées de paiement (chèques, vouchers).
- [ ] **App:** Intégrer le plugin Capacitor Stripe Terminal pour le "Tap to Pay".
- [ ] **Modules:** Créer les interfaces d'encaissement (Carte, Espèces avec calcul rendu, Vouchers, Chèques).
- [ ] **Accounting:** Mettre à jour `ledger/route.ts` et la page de clôture journalière (`Z-Report`).

---

## 🛠️ Medium Priority: Fleet & Safety
**Objectif :** Digitaliser le carnet de santé des bateaux et sécuriser la navigation.

### Fleet Management [ROADMAP_MAINTENANCE]
- [ ] **DB:** Migration Prisma `add_fleet_management` (Champs batterie, MaintenanceLog).
- [ ] **Logic:** Implémenter le calcul automatique des cycles de charge (Alertes J+3/J+4).
- [ ] **Dashboard:** Créer la page `admin/fleet` avec indicateurs visuels (Batterie/Mécanique).
- [ ] **Actions:** Ajouter les boutons rapides "Marquer comme Chargée" et "Signaler Incident".
- [ ] **Auto:** Intégrer le scan des batteries au script `daily-maintenance.ps1`.

### Meteo & Alerts [ROADMAP_METEO]
- [ ] **Infra:** Configurer OpenWeatherMap (API Key, Lat/Lon) dans `.env`.
- [ ] **Backend:** Créer le service `lib/weather.ts` avec cache (15min).
- [ ] **UI:** Développer le composant `WeatherWidget` (Indicateurs Vent/Pluie).
- [ ] **Integration:** Insérer le widget en tête du dashboard `admin/today`.

---

## 📢 Standard Priority: CMS & Automation
**Objectif :** Autonomie client sur le contenu et récolte d'avis.

### CMS Module [ROADMAP_CMS]
- [ ] **DB:** Migration Prisma `add_cms_tables` (SiteConfig, HeroSlide, Partner).
- [ ] **Admin:** Créer les composants d'édition (TranslatableInput, RichTextEditor, ImageUploader).
- [ ] **Pages:** Développer les gestionnaires : Hero (Drag&Drop), Partenaires, Textes.
- [ ] **Front:** Connecter le site vitrine aux données dynamiques (`lib/i18n-cms.ts`).

### Review Automation [ROADMAP_EXPERIENCE]
- [ ] **DB:** Migration Prisma `add_review_mail_tracking` (Booking.reviewMailSent).
- [ ] **Config:** Configurer l'identité email `experience@sweet-narcisse.fr`.
- [ ] **Cron:** Créer la route API `send-reviews` (Ciblage J-1, CONFIRMED, EMBARQUED).
- [ ] **Script:** Ajouter l'appel API au script de maintenance quotidien.

---

## 🧊 Low Priority: Kiosk Mode
**Objectif :** Borne autonome (Optionnel).

### Self-Service Kiosk [ROADMAP_KiOSQUE]
- [ ] **Routing:** Créer le layout `app/kiosk` (isolé, sans navigation).
- [ ] **Security:** Implémenter le `InactivityTimer` (Auto-reset 60s).
- [ ] **Flow:** Développer le tunnel de réservation simplifié (3 étapes).
- [ ] **Payment:** Intégrer le "Payment Request Button" (Apple Pay/Google Pay) et le fallback QR Code.