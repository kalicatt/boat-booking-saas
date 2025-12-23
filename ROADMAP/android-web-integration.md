# Intégration Web → Mobile: Tap to Pay déclenché

## 🎯 Fonctionnalité

Depuis l'admin web (QuickBookingModal), l'employé peut créer une réservation et sélectionner "Paiement par carte". L'application Android se met automatiquement en écoute et **ouvre PaymentActivity avec le montant pré-rempli** pour collecter le paiement NFC.

## 🏗️ Architecture

### Flow complet

```
1. Admin Web (QuickBookingModal)
   └─> Sélectionne "Paiement par carte"
   └─> Crée réservation
   └─> POST /api/payments/terminal/session
       └─> Crée PaymentSession (PENDING) dans DB

2. App Android (PaymentPollingService)
   └─> Poll toutes les 5s: GET /api/mobile/payments/sessions/claim?deviceId=xxx
   └─> Si session disponible:
       └─> Session passée à CLAIMED
       └─> Broadcast "PAYMENT_SESSION_CLAIMED"

3. DashboardActivity (BroadcastReceiver)
   └─> Reçoit broadcast
   └─> Toast notification
   └─> Ouvre PaymentActivity avec extras:
       - sessionId
       - bookingId
       - amountCents
       - currency
       - customerName
       - bookingReference

4. PaymentActivity
   └─> Mode "triggered" détecté
   └─> Montant pré-rempli (readonly)
   └─> Employé clique "Collecter"
   └─> PATCH /api/mobile/payments/sessions/{id} → PROCESSING
   └─> [Stripe Terminal collection - Phase 2]
   └─> Si succès: PATCH → SUCCEEDED
   └─> Si échec: PATCH → FAILED
```

## 📊 Tables Database

### PaymentSession (déjà existante)

```prisma
model PaymentSession {
  id                   String   @id @default(cuid())
  bookingId            String
  amount               Int      // Montant en centimes
  currency             String   @default("EUR")
  provider             String   @default("stripe_terminal")
  methodType           String   @default("card")
  
  // Statuses: PENDING → CLAIMED → PROCESSING → SUCCEEDED/FAILED/EXPIRED
  status               PaymentSessionStatus @default(PENDING)
  
  targetDeviceId       String?  // Device spécifique (optionnel)
  claimedByDeviceId    String?  // Device qui a claimed
  
  intentId             String?  // Stripe PaymentIntent ID
  intentClientSecret   String?
  
  createdById          String?
  metadata             Json?    // { customer, bookingReference, slot, boat }
  
  lastError            String?
  
  createdAt            DateTime @default(now())
  expiresAt            DateTime // TTL 7 minutes
  claimedAt            DateTime?
  processingAt         DateTime?
  completedAt          DateTime?
}

enum PaymentSessionStatus {
  PENDING      // Créée, en attente de claim
  CLAIMED      // Claimed par un device
  PROCESSING   // Payment en cours
  SUCCEEDED    // Payment réussi
  FAILED       // Payment échoué
  EXPIRED      // Expirée sans être traitée
}
```

## 🔌 APIs Backend

### 1. Créer session (Web → Backend)

**Endpoint:** `POST /api/payments/terminal/session`

**Body:**
```json
{
  "bookingId": "clxxxxx",
  "amountCents": 2500,  // Optionnel, sinon booking.totalPrice
  "currency": "EUR",
  "targetDeviceId": null  // Optionnel
}
```

**Response:**
```json
{
  "session": {
    "id": "clsession123",
    "bookingId": "clxxxxx",
    "amount": 2500,
    "currency": "EUR",
    "status": "PENDING",
    "expiresAt": "2024-12-23T15:07:00.000Z"
  }
}
```

**Implémentation:** ✅ Déjà existe

---

### 2. Claim session (Mobile → Backend)

**Endpoint:** `GET /api/mobile/payments/sessions/claim?deviceId={androidId}`

**Response si session disponible:**
```json
{
  "session": {
    "id": "clsession123",
    "bookingId": "clxxxxx",
    "amount": 2500,
    "currency": "EUR",
    "metadata": {
      "customer": "Jean Dupont",
      "bookingReference": "SN-20241223-ABC123",
      "slot": "2024-01-20T14:00:00.000Z",
      "boat": "Sweet Narcisse I"
    },
    "expiresAt": "2024-12-23T15:07:00.000Z"
  }
}
```

**Response si aucune session:**
```
HTTP 204 No Content
```

**Logique:**
1. Cherche première session PENDING non expirée
2. Optionnellement filtrée par targetDeviceId
3. Mise à jour status → CLAIMED
4. Enregistre claimedByDeviceId + claimedAt
5. Retourne session

**Implémentation:** ✅ Créée

---

### 3. Update session status (Mobile → Backend)

**Endpoint:** `PATCH /api/mobile/payments/sessions/{id}`

**Body:**
```json
{
  "status": "PROCESSING",  // ou SUCCEEDED, FAILED
  "error": "Card declined"  // Optionnel si FAILED
}
```

**Response:**
```json
{
  "session": {
    "id": "clsession123",
    "status": "PROCESSING",
    ...
  }
}
```

**Implémentation:** ✅ Créée

---

## 📱 Composants Android

### 1. PaymentPollingService

**Type:** Foreground Service

**Rôle:**
- Poll `/api/mobile/payments/sessions/claim` toutes les 5s
- Si session claimed → broadcast Intent
- Notification foreground permanente

**Fichier:** `PaymentPollingService.java` ✅

**Démarrage:** Automatique au login (DashboardActivity.onCreate)

**Broadcast:**
```java
Intent broadcast = new Intent("com.sweetnarcisse.PAYMENT_SESSION_CLAIMED");
broadcast.putExtra("sessionId", sessionId);
broadcast.putExtra("bookingId", bookingId);
broadcast.putExtra("amountCents", amountCents);
broadcast.putExtra("currency", currency);
broadcast.putExtra("customerName", customerName);
broadcast.putExtra("bookingReference", bookingReference);
sendBroadcast(broadcast);
```

---

### 2. DashboardActivity.PaymentSessionReceiver

**Type:** BroadcastReceiver

**Rôle:**
- Écoute broadcast "PAYMENT_SESSION_CLAIMED"
- Affiche Toast notification
- Ouvre PaymentActivity avec Intent extras

**Fichier:** `DashboardActivity.java` ✅

**Enregistrement:**
```java
IntentFilter filter = new IntentFilter("com.sweetnarcisse.PAYMENT_SESSION_CLAIMED");
registerReceiver(paymentReceiver, filter);
```

---

### 3. PaymentActivity (2 modes)

**Mode Manual:**
- Employé entre montant manuellement
- Input éditable
- Pas de sessionId

**Mode Triggered:**
- Déclenché depuis web
- Intent extras contient sessionId, bookingId, amountCents
- Montant pré-rempli (readonly)
- Affiche customerName, bookingReference

**Fichier:** `PaymentActivity.java` ✅

**TODO Phase 2:**
- Stripe Terminal initialization
- Reader discovery
- Payment collection
- Update session status

---

### 4. PaymentService

**Type:** API Client

**Méthodes:**
- `claimNextSession(deviceId, callback)`
- `updateSessionStatus(sessionId, status, error, callback)`
- `createPaymentIntent(sessionId, bookingId, amountCents, callback)` (Phase 2)
- `confirmPayment(sessionId, paymentIntentId, callback)` (Phase 2)

**Fichier:** `PaymentService.java` ✅

---

## 🔧 Configuration

### AndroidManifest.xml

```xml
<!-- Service -->
<service
    android:name=".PaymentPollingService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="dataSync" />

<!-- Permissions -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

✅ Configuré

---

## 🧪 Test du flow

### 1. Préparation

```bash
# Backend Next.js running
cd sweet-narcisse
npm run dev

# App Android installée sur device
# Employé connecté sur app
```

### 2. Scénario test

1. **Sur app Android:**
   - Login employé
   - Dashboard s'ouvre
   - Service polling démarre → notification "En attente de paiements..."

2. **Sur admin web:**
   - Ouvrir Planning
   - Clic sur slot horaire
   - QuickBookingModal s'ouvre
   - Remplir formulaire
   - Cocher "Marquer comme payé"
   - Sélectionner "Carte bancaire"
   - Cliquer "Confirmer la réservation"

3. **Backend:**
   - Réservation créée
   - PaymentSession créée (PENDING)
   - Alert "Réservation créée. Le Tap to Pay est prêt sur le téléphone."

4. **Sur app Android (dans les 5s):**
   - Polling claim la session
   - Broadcast envoyé
   - Toast "Nouveau paiement: 25.00 EUR"
   - **PaymentActivity s'ouvre automatiquement**
   - Montant pré-rempli: 25.00
   - Mode: "🌐 Paiement déclenché depuis le web"
   - Client: "Jean Dupont"
   - Réf: "SN-20241223-ABC123"

5. **Employé sur app:**
   - Clic "Collecter le paiement"
   - [TODO Phase 2: Stripe Terminal]

### 3. Logs à vérifier

**Backend:**
```
[terminal/session] create session for booking clxxxxx
[mobile/payments/sessions/claim] session clsession123 claimed by device abc123
```

**Android:**
```
PaymentPollingService: Session claimed: clsession123, montant: 2500 EUR
DashboardActivity: Paiement reçu: 2500 EUR pour SN-20241223-ABC123
PaymentActivity: Mode triggered: session=clsession123, montant=2500
```

---

## ⚙️ Paramètres tuning

### Polling interval

**Actuel:** 5000ms (5 secondes)

**Recommandations:**
- Environnement test: 3000ms (réactivité)
- Production: 5000-10000ms (économie batterie)

**Modifier dans:** `PaymentPollingService.java`
```java
private static final long POLL_INTERVAL_MS = 5000;
```

### Session TTL

**Actuel:** 7 minutes

**Logique:**
- Session PENDING expirée si non claimed dans 7min
- Employé a le temps de prendre le téléphone

**Modifier dans:** `lib/payments/paymentSessions.ts`
```typescript
const SESSION_TTL_MINUTES = 7;
```

---

## 🚀 Prochaines étapes Phase 2

- [ ] Stripe Terminal SDK initialization
- [ ] Reader discovery (LocalMobile)
- [ ] PaymentIntent creation
- [ ] Collect payment method (NFC)
- [ ] Process payment
- [ ] Update session SUCCEEDED/FAILED
- [ ] Confirmation screen
- [ ] Webhook Stripe pour sync

---

## 📝 Notes

### Pourquoi polling au lieu de push notifications?

**Avantages polling:**
- Simple à implémenter
- Pas besoin Firebase Cloud Messaging
- Fonctionne offline puis sync
- Latence acceptable (5s)

**Inconvénients:**
- Consommation batterie (mitigé par foreground service)
- Latence 0-5s

**Alternative future:** FCM push si besoin latence <1s

### Device ID

**Actuel:** Android `ANDROID_ID`

**Caractéristiques:**
- Unique par device
- Persist factory reset
- Accessible sans permission

**Code:**
```java
String deviceId = Settings.Secure.getString(
    getContentResolver(), 
    Settings.Secure.ANDROID_ID
);
```

### Sécurité

- ✅ NextAuth session cookies requis
- ✅ STAFF_ROLES vérifié (ADMIN, EMPLOYEE)
- ✅ Session expiration 7min
- ✅ HTTPS only
- ⚠️ Pas de rate limiting polling (à ajouter si abus)

---

**Statut:** ✅ Infrastructure complète, prêt pour Stripe Terminal Phase 2
