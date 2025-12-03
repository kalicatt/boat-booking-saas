# Roadmap POS : Système d'Encaissement Unifié (Stripe Terminal)

Ce document détaille l'intégration des paiements physiques directement dans l'application mobile Admin, transformant les smartphones du staff en terminaux de paiement (Tap to Pay) et centralisant la gestion des espèces, chèques et vouchers.

---

## 🏗️ Phase 1 : Backend & Infrastructure
**Objectif :** Préparer la base de données et Stripe pour les paiements physiques.

### 1. Configuration Stripe
* **Action :** Activer "Terminal" dans le Dashboard Stripe.
* **Lieu :** Créer une Location "Base Nautique" (récupérer `location_id`).

### 2. API Connection Token
* **Nouvelle Route :** `app/api/payments/terminal/token/route.ts`
* **Logique :** Générer un secret éphémère pour connecter le lecteur (téléphone) à Stripe.

### 3. Sessions de paiement “remote”
* **Nouvelle Route :** `app/api/payments/terminal/session/route.ts`
* **Concept :** La tablette crée une session `pending` (bookingId, montant, méthode `card_remote`).
* **Stockage :** Table `PaymentSession` (status, provider, metadata, expiresAt) + diffusion via WebSocket/Server-Sent Events aux mobiles connectés.
* **Transitions :** `pending -> claimed -> processing -> succeeded/failed/expired`.

### 4. Mise à jour Modèle de Données
* **Fichier :** `app/api/bookings/route.ts`
* **Modification :** Étendre la logique d'enregistrement pour accepter des métadonnées riches dans `rawPayload` (numéro de chèque, référence voucher, etc.) et référencer `paymentSessionId` lorsqu'un paiement est déclenché depuis la tablette.

---

## 📱 Phase 2 : Tap to Pay (Capacitor)
**Objectif :** Paiement sans contact sur iPhone/Android sans matériel externe.

### 1. Plugin Terminal
* **Installation :** `@capacitor-community/stripe-terminal` (ou wrapper natif).
* **Configuration :**
  * **iOS :** Ajouter "Privacy - Bluetooth Always Usage Description" et "Location Usage" dans `Info.plist`.
  * **Android :** Permissions localisations dans `AndroidManifest.xml`.

### 2. Workflow "Tap to Pay"
* **Composants :**
    * Tablette : `PaymentLauncher.tsx` (crée/monitor la session).
    * Téléphone : `PaymentTerminal.tsx` (Capacitor).
* **Logique Téléphone :**
    1. S'abonner aux sessions `pending` via WebSocket.
    2. Sur “Claim”, récupérer `connection_token` puis démarrer Stripe Terminal (`discover.localMobile -> collectPaymentMethod -> process`).
    3. Publier l'état (`processing/succeeded/failed`) sur l'API pour mettre à jour la tablette en temps réel.
* **Fallback link :** Si aucun mobile ne répond, la session peut générer un Payment Link Stripe + QR code partagé par SMS/email depuis la tablette.

---

## 💻 Phase 3 : Interface de Vente (UX Admin)
**Objectif :** Une caisse tout-en-un fluide pour le staff.

### 1. Module "💳 Carte (Sans Contact)"
* **Action Tablette :** Crée la session, choisit le montant, affiche l'état “En attente d'un téléphone”.
* **Handoff :** Quand un mobile staff “claim” la session, la tablette passe en mode suivi (spinner + timer + options annuler/réessayer).
* **Etat final :** Affiche le reçu lorsqu'un `succeeded` revient, propose fallback QR/Payment Link si `expired` ou `failed` multiples.

### 2. Module "💵 Espèces"
* **Action :** Affiche le montant dû.
* **Calculateur :** Champ "Montant Reçu" -> Affiche "A rendre : X €".

### 3. Module "🏨 Voucher / Hôtel"
* **Action :** Ouvre un formulaire dédié partenaires.
* **Champs :**
    * **Émetteur :** Liste déroulante (Hôtel A, Hôtel B...).
    * **Référence :** Champ texte libre (N° du bon).
    * **Quantité :** Stepper (- 1 +).
* **Calcul :** Met à jour le total si le voucher a une valeur fixe, sinon saisie manuelle.

### 4. Module "✍️ Chèque"
* **Action :** Formulaire de traçabilité.
* **Champs :**
    * **Numéro :** Obligatoire (ex: 800412).
    * **Banque :** Optionnel (ex: Crédit Mutuel).
* **Backend :** Stocke ces infos dans le JSON du paiement.

### 5. Fallback "QR Code"
* **Action :** Affiche un QR Code de paiement Stripe Checkout (si le Tap to Pay échoue).

---

## 🧾 Phase 4 : Clôture & Reporting (Z-Report)
**Objectif :** Automatiser la comptabilité et sécuriser la caisse.

### 1. Mise à jour Ledger
* **Fichier :** `app/api/admin/ledger/route.ts`
* **Logique :** Enregistrer chaque transaction avec son `provider` précis (stripe_terminal, cash, voucher, check).

### 2. Page de Clôture Journalière
* **Fichier :** `app/admin/accounting/[day]/page.tsx`/page.tsx]
* **Assistant de Clôture :**
    * **Cartes :** Total auto-rempli via API Stripe (pas de comptage).
    * **Espèces :** Champ de saisie "Fond de caisse final". Calcul de l'écart.
    * **Vouchers :** "Vérifiez que vous avez **3** bons 'Hôtel Bristol' et **1** bon 'OT'."
    * **Chèques :** "Vérifiez les **2** chèques : N°800412 (50€) et N°992100 (12€)."