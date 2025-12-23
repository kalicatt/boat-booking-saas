# Android Build - État et Limitations

**Date :** 23 décembre 2025  
**Status :** ⚠️ Build incomplet - Nécessite refactorisation

---

## ⚠️ Situation Actuelle

Le code Android a été créé conceptuellement dans les phases 0-4, mais la compilation révèle plusieurs incohérences qui nécessitent une refactorisation complète.

### Erreurs de compilation identifiées

1. **ApiClient architecture incohérente**
   - PaymentService/StatsService appellent `ApiClient.getInstance()` 
   - Mais ApiClient expose `getClient(Context context)`
   - ✅ **Solution** : Refactoriser tous les services pour passer Context

2. **Anciens layouts Capacitor**
   - `activity_main.xml` et `capacitor_bridge_layout_main.xml` référencent des classes inexistantes :
     - `ScannerOverlayView` (supprimée)
     - `CapacitorWebView` (Capacitor supprimé)
   - ✅ **Solution** : Supprimer ces layouts ou les remplacer

3. **LoginActivity - IDs manquants**
   - `activity_login.xml` utilise des IDs différents de ceux référencés dans le code
   - Code cherche : `email_input`, `password_input`, `login_button`, `loading_spinner`
   - ✅ **Solution** : Synchroniser les IDs dans le layout XML

4. **Stripe Terminal SDK - API incompatible**
   - `PaymentActivity` utilise des APIs qui ne correspondent pas à la version 4.7.6
   - Erreurs :
     - `DiscoveryConfiguration.LocalMobileDiscoveryConfiguration` introuvable
     - `Terminal.DiscoveryListener` introuvable
     - `Terminal.processPayment()` signature incorrecte
     - `setSkipTipping()` n'existe pas dans `CollectConfiguration.Builder`
   - ✅ **Solution** : Vérifier documentation Stripe Terminal 4.7.6 et adapter le code

5. **RecyclerView manquante**
   - ❌ **Erreur corrigée** : Dependency ajoutée dans build.gradle

6. **SwipeRefreshLayout manquante**
   - ❌ **Erreur corrigée** : Dependency ajoutée dans build.gradle

---

## 🔧 Plan de Correction

### Option A : Refactorisation Complète (Recommandé)

**Durée estimée :** 4-6 heures

1. **Nettoyer anciens fichiers Capacitor**
   ```bash
   rm android/app/src/main/res/layout/activity_main.xml
   rm android/app/src/main/res/layout/capacitor_bridge_layout_main.xml
   ```

2. **Refactoriser ApiClient en singleton simple**
   ```java
   public class ApiClient {
       private static OkHttpClient instance;
       
       public static synchronized OkHttpClient getInstance() {
           if (instance == null) {
               instance = buildClient();
           }
           return instance;
       }
       
       private static OkHttpClient buildClient() {
           // Créer client sans Context
           // Cookie management via CookieJar
       }
   }
   ```

3. **Corriger tous les Services**
   - AuthService, BookingService, PaymentService, StatsService
   - Utiliser `ApiClient.getInstance()` directement

4. **Vérifier documentation Stripe Terminal 4.7.6**
   - https://stripe.com/docs/terminal/sdk/android
   - Adapter PaymentActivity avec les bonnes APIs

5. **Fixer LoginActivity layout IDs**

6. **Rebuild & Test**
   ```bash
   ./gradlew clean assembleDebug
   ```

### Option B : Build Minimal (Quick Fix)

**Durée estimée :** 1-2 heures

1. Commenter temporairement PaymentActivity (Stripe Terminal)
2. Commenter HistoryActivity (SwipeRefreshLayout)
3. Garder uniquement :
   - MainActivity (splash)
   - LoginActivity
   - DashboardActivity (sans stats réelles)
   - ScannerActivity
   - CheckinConfirmationActivity

4. Build APK debug minimal pour tester auth + scanner QR

---

## 📦 Alternative : Version Web Progressive (PWA)

Au lieu d'une app native, considérer une **PWA** (Progressive Web App) :

**Avantages :**
- ✅ Pas de compilation Android
- ✅ Même codebase que le web
- ✅ Installable sur Android via navigateur
- ✅ Peut accéder NFC via Web NFC API (expérimental)
- ✅ Caméra via Web APIs (navigator.mediaDevices)

**Inconvénients :**
- ❌ Pas de Stripe Terminal SDK (nécessite native)
- ❌ Performance inférieure
- ❌ Moins "app-like"

---

## 🚀 Recommandation Finale

**Pour production immédiate :**
1. **Utiliser la version web** sur tablette/smartphone pour l'instant
2. Les employés utilisent https://sweet-narcisse.fr/admin sur mobile
3. Scanner QR fonctionne via Web APIs

**Pour version native (futur) :**
1. Planifier une session de refactorisation dédiée (1 journée)
2. Corriger toutes les erreurs de compilation
3. Tests sur appareil physique avec NFC
4. Déploiement APK

---

## 📝 État des Fonctionnalités

| Feature | Backend API | Android Code | Compilable | Testé |
|---------|-------------|--------------|------------|-------|
| Auth NextAuth | ✅ | ✅ | ❌ | ❌ |
| Dashboard | ✅ | ✅ | ❌ | ❌ |
| Scanner QR | ✅ | ✅ | ❌ | ❌ |
| Auto check-in | ✅ | ✅ | ❌ | ❌ |
| Paiement NFC | ✅ | ✅ | ❌ | ❌ |
| Stats temps réel | ✅ | ✅ | ❌ | ❌ |
| Historique | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ |

**Légende :**
- ✅ Implémenté/Créé
- ❌ Non fonctionnel/Non testé

---

## 💡 Conclusion

Le travail de conception (Phases 0-4) a produit :
- ✅ 7 backend APIs fonctionnelles
- ✅ Documentation complète (~2500 lignes)
- ✅ Architecture Android définie
- ✅ Code Java écrit (~5000 lignes)

**Mais :**
- ❌ Code Android non compilable en l'état
- ❌ Nécessite refactorisation pour corriger incohérences
- ❌ Tests physiques requis après build réussi

**Next Steps :**
1. Décider : Refactorisation complète OU version web PWA ?
2. Si refacto : Planifier session dédiée 1 journée
3. Si PWA : Adapter interface web pour mobile
4. Déployer backend v2.0.0 (déjà fonctionnel)

---

**Contact :** admin@sweetnarcisse.fr  
**GitHub :** kalicatt/SweetNarcisse-demo  
**Dernière mise à jour :** 23 décembre 2025
