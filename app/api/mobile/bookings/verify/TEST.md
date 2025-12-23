# Test de l'API Mobile Bookings Verify

## Endpoint
```
POST /api/mobile/bookings/verify
```

## Authentification requise
L'employé doit être connecté avec NextAuth (cookie de session).

## Exemple de requête

### Format QR Code scanné
```
https://sweet-narcisse.fr/booking-qr/clx123abc456/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Extraction des données
```typescript
const qrUrl = "https://sweet-narcisse.fr/booking-qr/clx123abc456/eyJhbGci..."
const parts = qrUrl.split('/booking-qr/')[1].split('/')
const bookingId = parts[0]  // "clx123abc456"
const token = parts[1]       // "eyJhbGci..."
```

### Requête HTTP
```bash
curl -X POST https://sweet-narcisse.fr/api/mobile/bookings/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "bookingId": "clx123abc456",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "autoCheckin": true
  }'
```

## Réponses possibles

### ✅ Succès - Premier scan (check-in automatique)
```json
{
  "valid": true,
  "autoCheckedIn": true,
  "alreadyCheckedIn": false,
  "booking": {
    "id": "clx123abc456",
    "publicReference": "SN-12345",
    "customerName": "Jean Dupont",
    "customerEmail": "jean.dupont@example.com",
    "customerPhone": "+33612345678",
    "startTime": "2025-12-23T14:30:00.000Z",
    "endTime": "2025-12-23T16:30:00.000Z",
    "date": "2025-12-23T00:00:00.000Z",
    "boatName": "Barque #3",
    "boatCapacity": 6,
    "language": "fr",
    "isPaid": true,
    "totalPrice": 25.00,
    "participants": {
      "adults": 3,
      "children": 1,
      "babies": 0,
      "total": 4
    },
    "checkinStatus": "EMBARQUED",
    "status": "CONFIRMED",
    "paymentMethod": "STRIPE",
    "createdAt": "2025-12-20T10:15:00.000Z"
  }
}
```

### ℹ️ Succès - Déjà embarqué (scan multiple)
```json
{
  "valid": true,
  "autoCheckedIn": false,
  "alreadyCheckedIn": true,
  "booking": {
    "id": "clx123abc456",
    "publicReference": "SN-12345",
    "customerName": "Jean Dupont",
    "startTime": "2025-12-23T14:30:00.000Z",
    "endTime": "2025-12-23T16:30:00.000Z",
    "boatName": "Barque #3",
    "language": "fr",
    "isPaid": true,
    "totalPrice": 25.00,
    "participants": {
      "adults": 3,
      "children": 1,
      "babies": 0,
      "total": 4
    },
    "checkinStatus": "EMBARQUED",
    "status": "CONFIRMED",
    "paymentMethod": "STRIPE"
  }
}
```

### ❌ Erreur - QR invalide
```json
{
  "valid": false,
  "error": "QR code invalide ou expiré"
}
```
**Status HTTP**: 403

### ❌ Erreur - Réservation annulée
```json
{
  "valid": false,
  "error": "Réservation annulée",
  "booking": {
    "publicReference": "SN-12345",
    "status": "CANCELLED"
  }
}
```
**Status HTTP**: 409

### ❌ Erreur - Réservation introuvable
```json
{
  "valid": false,
  "error": "Réservation introuvable"
}
```
**Status HTTP**: 404

### ❌ Erreur - Non authentifié
```json
{
  "valid": false,
  "error": "Accès refusé - Authentification requise"
}
```
**Status HTTP**: 403

## Comportement de l'app Android

### Cas 1: Scan réussi (premier check-in)
```kotlin
// Réponse reçue
if (response.valid && response.autoCheckedIn) {
    // ✅ Afficher écran de confirmation
    showSuccessScreen(
        customerName = response.booking.customerName,
        time = "${formatTime(response.booking.startTime)} - ${formatTime(response.booking.endTime)}",
        boatName = response.booking.boatName,
        language = response.booking.language,
        isPaid = response.booking.isPaid,
        participants = response.booking.participants.total,
        reference = response.booking.publicReference,
        message = "EMBARQUÉ ✅"
    )
    
    // Vibration + son de succès
    vibrate(200)
    playSuccessSound()
    
    // Retour au scanner après 2s
    delay(2000)
    navigateToScanner()
}
```

### Cas 2: Déjà embarqué
```kotlin
if (response.valid && response.alreadyCheckedIn) {
    // ℹ️ Afficher info déjà check-in
    showInfoScreen(
        customerName = response.booking.customerName,
        message = "Déjà embarqué",
        icon = Icons.Info
    )
    
    // Retour rapide
    delay(1500)
    navigateToScanner()
}
```

### Cas 3: Erreur
```kotlin
if (!response.valid) {
    // ❌ Afficher erreur
    showErrorScreen(
        title = when {
            response.error.contains("annulée") -> "Réservation annulée"
            response.error.contains("invalide") -> "QR code invalide"
            response.error.contains("introuvable") -> "Réservation non trouvée"
            else -> "Erreur"
        },
        message = response.error,
        action = "RÉESSAYER"
    )
}
```

## Logs créés

### Log succès (premier check-in)
```
Type: MOBILE_QR_CHECKIN
Message: Check-in automatique via QR pour SN-12345 - Jean Dupont
UserId: clx-employee-123
Timestamp: 2025-12-23T14:28:00Z
```

### Log scan déjà embarqué
```
Type: MOBILE_QR_SCAN_ALREADY_CHECKIN
Message: QR scanné pour SN-12345 - Déjà embarqué
UserId: clx-employee-123
Timestamp: 2025-12-23T14:30:00Z
```

### Log QR invalide
```
Type: MOBILE_QR_SCAN_INVALID
Message: QR invalide pour booking clx123abc456
Timestamp: 2025-12-23T14:32:00Z
```

## Tests manuels

### Test 1: QR valide, première fois
1. Scanner un QR code de réservation confirmée
2. Vérifier que `autoCheckedIn: true`
3. Vérifier que `checkinStatus: "EMBARQUED"`
4. Vérifier dans l'admin web que le statut est à jour

### Test 2: Scanner deux fois le même QR
1. Scanner le QR d'une réservation déjà embarquée
2. Vérifier que `alreadyCheckedIn: true`
3. Vérifier que `autoCheckedIn: false`
4. Pas de nouvelle modification en DB

### Test 3: QR d'une réservation annulée
1. Scanner le QR d'une réservation avec status CANCELLED
2. Vérifier erreur 409 "Réservation annulée"
3. Afficher message d'erreur clair

### Test 4: QR expiré ou token invalide
1. Scanner un QR avec token modifié/invalide
2. Vérifier erreur 403 "QR code invalide ou expiré"

### Test 5: Sans authentification
1. Se déconnecter
2. Essayer de scanner
3. Vérifier erreur 403 "Accès refusé"

## Intégration avec l'existant

### Admin web - Planning
Le statut `EMBARQUED` s'affiche immédiatement dans:
- `/admin/planning` (vue jour/semaine)
- `/admin/today` (page du jour)
- `/admin/reservations` (liste complète)

### Notifications temps réel
Si WebSocket/SSE activé, l'embarquement peut déclencher:
- Update du planning en temps réel
- Notification aux autres employés connectés

### Statistiques
Le check-in est comptabilisé dans:
- Dashboard "Aujourd'hui" (nombre d'embarquements)
- Stats du jour/semaine/mois
- Logs d'activité

## Sécurité

### Vérifications effectuées
1. ✅ Authentification NextAuth (session obligatoire)
2. ✅ Rôle ADMIN/EMPLOYEE requis
3. ✅ Token JWT du QR vérifié avec HMAC
4. ✅ Booking existe en DB
5. ✅ Pas annulé
6. ✅ Logging de toutes les actions

### Protection contre abus
- Rate limiting possible (à ajouter si besoin)
- Logs traçables avec userId
- Token QR limité dans le temps (configurable)
