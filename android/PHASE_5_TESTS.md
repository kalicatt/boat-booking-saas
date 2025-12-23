# Phase 5 : Tests & Debug - Checklist

**Version :** 2.0.0 (200)  
**Date :** 25 janvier 2024  
**Testeur :** _____________  
**Appareil :** _____________  
**Android version :** _____________

---

## ✅ Tests Fonctionnels

### 1. Authentification

#### Test 1.1 : Login avec credentials valides
- [ ] Ouvrir l'app → écran login affiché
- [ ] Entrer email : `admin@sweetnarcisse.fr`
- [ ] Entrer password : (credentials valides)
- [ ] Clic "SE CONNECTER"
- [ ] ✅ Redirection vers Dashboard
- [ ] ✅ Message "Bonjour, ..." affiché
- [ ] ✅ Pas d'erreur dans logcat

**Logcat :**
```bash
adb logcat | grep "LoginActivity\|AuthService"
```

#### Test 1.2 : Login avec credentials invalides
- [ ] Logout de l'app
- [ ] Entrer email : `test@test.com`
- [ ] Entrer password : `wrongpassword`
- [ ] Clic "SE CONNECTER"
- [ ] ✅ Message d'erreur affiché
- [ ] ✅ Reste sur écran login
- [ ] ✅ Log erreur 401 dans logcat

#### Test 1.3 : Session persistante
- [ ] Login avec credentials valides
- [ ] Fermer l'app (force close)
- [ ] Rouvrir l'app
- [ ] ✅ Dashboard affiché directement (skip login)
- [ ] ✅ Stats chargées

#### Test 1.4 : Logout
- [ ] Dashboard → Menu (⋮) → "Déconnexion"
- [ ] ✅ Redirection vers Login
- [ ] ✅ Back button ne retourne pas au Dashboard
- [ ] ✅ Cookies effacés dans logcat

---

### 2. Dashboard

#### Test 2.1 : Chargement stats initiales
- [ ] Login → Dashboard affiché
- [ ] Attendre 2 secondes
- [ ] ✅ "X embarquements" affiché (X = count réel ou 0)
- [ ] ✅ "X.XX € encaissés (Y)" affiché
- [ ] ✅ Pas d'erreur réseau dans logcat

**Logcat :**
```bash
adb logcat | grep "DashboardActivity\|StatsService"
```

#### Test 2.2 : Refresh stats après check-in
- [ ] Dashboard → "Scanner QR"
- [ ] Scanner un QR code valide
- [ ] Écran confirmation → attendre 3s → retour Dashboard
- [ ] ✅ Stats "embarquements" incrémenté de +1
- [ ] ✅ Log "Stats chargées" dans logcat

#### Test 2.3 : Refresh stats après paiement
- [ ] Dashboard → "Nouveau paiement"
- [ ] Compléter un paiement NFC réussi
- [ ] Retour Dashboard
- [ ] ✅ Stats "paiements" incrémenté de +1
- [ ] ✅ Stats "encaissés" augmenté du montant

#### Test 2.4 : Actions rapides
- [ ] Clic "Scanner QR" → ✅ ScannerActivity s'ouvre
- [ ] Back → Dashboard
- [ ] Clic "Nouveau paiement" → ✅ PaymentActivity s'ouvre (mode manual)
- [ ] Back → Dashboard
- [ ] Clic "Historique" → ✅ HistoryActivity s'ouvre

---

### 3. Scanner QR + Auto Check-in

#### Test 3.1 : Scanner QR valide
- [ ] Dashboard → "Scanner QR"
- [ ] Autoriser permission caméra si demandée
- [ ] ✅ Aperçu caméra affiché
- [ ] Scanner QR code d'une réservation CONFIRMED
- [ ] ✅ Vibration + feedback visuel
- [ ] ✅ CheckinConfirmationActivity s'ouvre
- [ ] ✅ Infos affichées : nom client, référence, bateau, créneau
- [ ] ✅ Status "EMBARQUÉ ✅"
- [ ] Attendre 3s
- [ ] ✅ Retour automatique au Dashboard

**Logcat :**
```bash
adb logcat | grep "ScannerActivity\|BookingService\|CheckinConfirmation"
```

#### Test 3.2 : Scanner QR invalide
- [ ] Scanner → Scanner un QR code aléatoire (pas une réservation)
- [ ] ✅ Toast "QR code non reconnu" ou similaire
- [ ] ✅ Reste sur ScannerActivity
- [ ] ✅ Caméra toujours active

#### Test 3.3 : Scanner sans réseau
- [ ] Activer mode avion
- [ ] Scanner QR code valide
- [ ] ✅ Toast "Erreur réseau" ou similaire
- [ ] Désactiver mode avion

#### Test 3.4 : Permission caméra refusée
- [ ] Settings → Apps → Sweet Narcisse → Permissions → Caméra → Refuser
- [ ] Dashboard → "Scanner QR"
- [ ] ✅ Message "Permission caméra requise"
- [ ] ✅ Demande permission ou redirect settings

---

### 4. Paiement NFC - Mode Manuel

#### Test 4.1 : Paiement manuel réussi
- [ ] Dashboard → "Nouveau paiement"
- [ ] ✅ Mode "manual" (pas de pré-remplissage)
- [ ] Entrer montant : `45.00`
- [ ] Clic "Collecter le paiement"
- [ ] ✅ Message "Découverte terminal..."
- [ ] ✅ ProgressBar visible
- [ ] ✅ Message "Connexion au terminal..."
- [ ] ✅ Message "Création paiement..."
- [ ] ✅ Message "Présentez la carte..."
- [ ] Présenter carte NFC test (4242...)
- [ ] ✅ Message "Traitement du paiement..."
- [ ] ✅ Message "✅ Paiement réussi !"
- [ ] ✅ Toast "Paiement confirmé !"
- [ ] ✅ Auto-fermeture après 2s

**Logcat :**
```bash
adb logcat | grep "PaymentActivity\|Terminal"
```

**Vérifier backend :**
- Web admin → vérifier booking PAID

#### Test 4.2 : Paiement manuel - carte déclinée
- [ ] Nouveau paiement → montant `45.00`
- [ ] Présenter carte test déclinée (4000 0000 0000 0002)
- [ ] ✅ Message erreur "Carte déclinée" ou similaire
- [ ] ✅ Session status = FAILED

#### Test 4.3 : Paiement manuel - montant vide
- [ ] Nouveau paiement → laisser montant vide
- [ ] Clic "Collecter le paiement"
- [ ] ✅ Toast "Montant requis" ou validation error

#### Test 4.4 : Paiement manuel - annulation
- [ ] Nouveau paiement → montant `45.00`
- [ ] Clic "Collecter le paiement"
- [ ] Attendre "Présentez la carte..."
- [ ] Back button ou Cancel
- [ ] ✅ Opération annulée
- [ ] ✅ Activity fermée
- [ ] ✅ Session status = FAILED dans backend

---

### 5. Paiement NFC - Mode Déclenché Web

#### Test 5.1 : Trigger depuis web → paiement réussi
- [ ] Ouvrir web admin sur desktop
- [ ] Planning → sélectionner réservation CONFIRMED
- [ ] Clic "Créer réservation" → sélectionner "paiement par carte"
- [ ] Clic confirmer
- [ ] ✅ PaymentSession créée (PENDING)
- [ ] Attendre max 5s sur mobile
- [ ] ✅ Notification Toast "Nouveau paiement: XX.XX EUR"
- [ ] ✅ PaymentActivity s'ouvre automatiquement
- [ ] ✅ Mode "triggered"
- [ ] ✅ Montant pré-rempli (readonly)
- [ ] ✅ Client name affiché
- [ ] ✅ Référence affichée
- [ ] Clic "Collecter le paiement"
- [ ] Flow complet jusqu'à succès
- [ ] ✅ Booking marqué PAID dans web admin
- [ ] ✅ PaymentSession status = SUCCEEDED

**Logcat :**
```bash
adb logcat | grep "PaymentPollingService\|PaymentSessionReceiver"
```

#### Test 5.2 : Trigger multiple sessions
- [ ] Web → créer 2 sessions paiement rapidement
- [ ] Mobile → première session claimée
- [ ] Compléter paiement #1
- [ ] ✅ Retour Dashboard
- [ ] Attendre 5s
- [ ] ✅ Deuxième session ouvre PaymentActivity
- [ ] Compléter paiement #2
- [ ] ✅ Les 2 bookings marqués PAID

#### Test 5.3 : Session expirée
- [ ] Web → créer session paiement
- [ ] Mobile → NE PAS ouvrir PaymentActivity (ignorer notification)
- [ ] Attendre 7 minutes
- [ ] Backend → session status = EXPIRED
- [ ] Mobile → polling ne la récupère plus

---

### 6. Historique

#### Test 6.1 : Liste historique
- [ ] Dashboard → "Historique"
- [ ] ✅ HistoryActivity s'ouvre
- [ ] ✅ Titre "Historique des réservations"
- [ ] ✅ Liste des réservations (7 derniers jours)
- [ ] ✅ Au moins 1 réservation affichée (si data existe)

**Vérifier affichage :**
- [ ] ✅ Référence : `#SN2401-XXXX`
- [ ] ✅ Badge status coloré : EMBARQUÉ (vert), CONFIRMÉ (bleu), ANNULÉ (rouge)
- [ ] ✅ Nom client + email
- [ ] ✅ Bateau + créneau
- [ ] ✅ Date embarquement formatée "DD/MM/YYYY HH:MM"
- [ ] ✅ Icon paiement : 💳 (card), 💰 (cash), ⏳ (pending)
- [ ] ✅ Montant formaté "XX.XX €"

#### Test 6.2 : Pull-to-refresh
- [ ] Historique → swipe down depuis le haut
- [ ] ✅ Spinner de refresh affiché
- [ ] ✅ Liste mise à jour
- [ ] ✅ Spinner disparaît

#### Test 6.3 : Empty state
- [ ] Backend → supprimer toutes les réservations des 7 derniers jours (ou changer dateFrom)
- [ ] Historique → pull-to-refresh
- [ ] ✅ Message "Aucune réservation" affiché
- [ ] ✅ RecyclerView caché

#### Test 6.4 : Scroll grande liste
- [ ] Backend → créer 100+ réservations de test
- [ ] Historique → scroll vers le bas
- [ ] ✅ Scroll fluide sans lag
- [ ] ✅ Pas de memory spike dans logcat

---

### 7. Settings

#### Test 7.1 : Affichage paramètres
- [ ] Dashboard → Menu (⋮) → "Paramètres"
- [ ] ✅ SettingsActivity s'ouvre
- [ ] ✅ Titre "Paramètres"
- [ ] ✅ Langue : "Français"
- [ ] ✅ Version : "2.0.0 (200)" (ou version actuelle)
- [ ] ✅ À propos : texte descriptif

#### Test 7.2 : Navigation back
- [ ] Settings → Back button (←)
- [ ] ✅ Retour Dashboard

---

## 🔋 Tests Performance

### 8. Battery Usage

#### Test 8.1 : Consommation background
- [ ] Login → Dashboard
- [ ] Home button (app en background)
- [ ] Attendre 1 heure
- [ ] Settings → Battery → App usage
- [ ] ✅ Sweet Narcisse < 2% battery usage
- [ ] ✅ PaymentPollingService visible dans "Background services"

**Logcat monitoring :**
```bash
adb shell dumpsys batterystats | grep sweetnarcisse
```

#### Test 8.2 : Consommation foreground
- [ ] Utiliser l'app activement 30 min (scanner, paiements, historique)
- [ ] Settings → Battery → App usage
- [ ] ✅ Consommation raisonnable (< 5%)

---

### 9. Memory Leaks

#### Test 9.1 : LeakCanary (si installé)
- [ ] Naviguer entre toutes les activities
- [ ] Login → Dashboard → Scanner → Dashboard → Paiement → Dashboard → Historique → Settings → Logout
- [ ] Répéter 5 fois
- [ ] ✅ Aucune notification LeakCanary
- [ ] ✅ Pas de "Activity leaked" dans logcat

**Logcat :**
```bash
adb logcat | grep "LeakCanary"
```

#### Test 9.2 : Memory monitor
- [ ] Android Studio → Profiler → Memory
- [ ] Naviguer entre activities pendant 5 min
- [ ] ✅ Memory usage stable (pas de croissance continue)
- [ ] ✅ GC réguliers, pas de spike

---

### 10. APK Size

#### Test 10.1 : Taille APK release
```bash
./gradlew assembleRelease
ls -lh app/build/outputs/apk/release/app-release.apk
```
- [ ] ✅ APK size < 15 MB

#### Test 10.2 : Analyse APK
```bash
./gradlew analyzeReleaseBundle
```
- [ ] ✅ Pas de dépendances inutiles
- [ ] ✅ ProGuard actif (si configuré)

---

## 🌐 Tests Réseau

### 11. Erreurs Réseau

#### Test 11.1 : Pas de connexion internet
- [ ] Activer mode avion
- [ ] Login
- [ ] ✅ Toast "Erreur réseau" ou "Pas de connexion"
- [ ] Dashboard → "Scanner QR"
- [ ] Scanner QR code
- [ ] ✅ Toast erreur affiché
- [ ] Désactiver mode avion

#### Test 11.2 : Connexion lente
- [ ] Android Studio → Profiler → Network → Simulate slow 3G
- [ ] Dashboard → refresh stats
- [ ] ✅ Spinner/loading affiché
- [ ] ✅ Stats chargées après délai
- [ ] ✅ Pas de timeout crash

#### Test 11.3 : Backend down
- [ ] Éteindre serveur backend (ou bloquer DNS)
- [ ] Dashboard → refresh stats
- [ ] ✅ Toast erreur affiché
- [ ] ✅ App ne crash pas
- [ ] Rallumer serveur

---

## 🔐 Tests Sécurité

### 12. Permissions

#### Test 12.1 : Permission CAMERA
- [ ] Première installation → Scanner QR
- [ ] ✅ Popup permission "Autoriser caméra ?"
- [ ] Refuser
- [ ] ✅ Message explicatif affiché
- [ ] Accepter
- [ ] ✅ Caméra fonctionne

#### Test 12.2 : Permission NFC
- [ ] Settings → NFC désactivé
- [ ] Paiement → collecter paiement
- [ ] ✅ Message "NFC requis" ou erreur
- [ ] Activer NFC
- [ ] ✅ Paiement fonctionne

#### Test 12.3 : Permission LOCATION
- [ ] Settings → Location OFF
- [ ] Paiement NFC
- [ ] ✅ Message "Location requise pour Stripe Terminal"
- [ ] Activer Location
- [ ] ✅ Paiement fonctionne

---

## 🐛 Tests Edge Cases

### 13. Edge Cases

#### Test 13.1 : Rotation écran
- [ ] Dashboard → rotate device
- [ ] ✅ Layout adapté, stats toujours affichées
- [ ] Scanner → rotate
- [ ] ✅ Caméra re-orientée correctement
- [ ] Paiement → rotate pendant collecte
- [ ] ✅ Pas de crash, état préservé

#### Test 13.2 : App tombée (force close)
- [ ] Paiement en cours → "Présentez la carte..."
- [ ] Force close app (Settings → Apps → Force Stop)
- [ ] Rouvrir app
- [ ] ✅ Dashboard affiché
- [ ] ✅ Session marquée FAILED backend (timeout)

#### Test 13.3 : Multitâche
- [ ] Paiement en cours
- [ ] Home button → ouvrir autre app → attendre 30s
- [ ] Retour à Sweet Narcisse
- [ ] ✅ PaymentActivity toujours active
- [ ] ✅ Peut compléter ou annuler

#### Test 13.4 : Low storage
- [ ] Settings → Storage → Remplir jusqu'à <100MB libre
- [ ] Utiliser app normalement
- [ ] ✅ Pas de crash
- [ ] ✅ Fonctions critiques marchent

#### Test 13.5 : Date/heure système changée
- [ ] Settings → Date & Time → changer à demain
- [ ] Dashboard → refresh stats
- [ ] ✅ Stats "aujourd'hui" = 0 (normal, backend filtre par date)
- [ ] Remettre date correcte

---

## 📊 Résultats

### Synthèse

**Total tests :** ___ / ___  
**Réussis :** ___ ✅  
**Échoués :** ___ ❌  
**Bloquants :** ___ 🔴  

### Bugs trouvés

| ID | Severité | Description | Étapes | Logcat | Status |
|----|----------|-------------|--------|--------|--------|
| 1  |          |             |        |        |        |
| 2  |          |             |        |        |        |
| 3  |          |             |        |        |        |

**Severités :**
- 🔴 Bloquant : impossible d'utiliser feature
- 🟠 Majeur : feature marche mais avec erreurs
- 🟡 Mineur : cosmetic, pas d'impact fonctionnel

---

## ✅ Validation

**App prête pour Phase 6 (Déploiement) :**
- [ ] Tous les tests fonctionnels passés
- [ ] Aucun bug bloquant
- [ ] Performance acceptable (battery, memory, APK size)
- [ ] Permissions OK
- [ ] Edge cases gérés

**Testeur :** _____________  
**Date :** _____________  
**Signature :** _____________

---

**Notes additionnelles :**

_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
