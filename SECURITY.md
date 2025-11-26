## Sécurité – Sweet Narcisse

Ce document résume les protections côté serveur mises en place et les recommandations pour aller plus loin.

### Validation & Sanitation
- Zod valide toutes les entrées sensibles (Employés, Blocs, Réservations).
- Les champs texte sont raccourcis (`cleanString`) et caractères invisibles supprimés.
- Suppression des balises `<script>` dans `notes`, `message`, `reason` pour réduire l’injection de script côté rendu mail / log.
- Retour HTTP 422 en cas de schéma invalide avec `issues` détaillées.

### Accès & Rôles
- Contrôle systématique du rôle avant mutations: seuls `SUPERADMIN`/`ADMIN` (selon action) peuvent créer/modifier/supprimer.
- Un `ADMIN` ne peut créer que des employés de rôle `EMPLOYEE`.
- Suppression utilisateur réservée au `SUPERADMIN`, impossible sur un compte `SUPERADMIN`.

### Cohérence Données
- Dates normalisées en UTC "mur" (suffixe `Z`) pour éviter décalages fuseau.
- Calculs d’occupation barque protègent contre conflits de réservation.
- Blocs journée court-circuitent l’API de disponibilités pour éviter surcharges de boucle.

### Atténuation Injection
- Aucune requête SQL construite manuellement (utilisation Prisma paramétré).
- Les entrées utilisateur sont filtrées, longueur limitée, typage strict côté serveur.
- Emails internes override (`isStaffOverride`) générés en sous-domaine local pour éviter collisions.

### Journalisation
- Toute action critique (création/suppression bloc, création/mise à jour/suppression employé, nouvelle réservation) loggée avec timestamp et utilisateur.
- Les tentatives invalides renvoient codes 4xx (possibilité d’ajouter une log dédiée si besoin).

### Recommandations Futures
1. Rate limiting: intégrer un système (Redis / Upstash) pour limiter POST (ex: 20/min/IP).
2. CSRF: utiliser token anti-CSRF si endpoints consommés par un navigateur authentifié (NextAuth fournit protections basiques; renforcer si formulaires externes).
3. Header Policy: configurer `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` via middleware.
4. Password strength: vérifier robustesse (zxcvbn) avant création d’employé / changement de mot de passe.
5. Audit logs externes: exporter les `Log` vers stockage immuable (S3 / Log service) pour non‑répudiation.
6. Monitoring sécurité: ajouter alertes sur volume anormal de 4xx ou création rapide de comptes.
7. Chiffrement au repos: s’assurer que la base Postgres est sur un volume chiffré (paramètre hosting).
8. Séparation Permissions: futur passage à RBAC plus granulaires si modules nouveaux (ex: STATISTIQUES lecture seule).
9. File Upload: si ajout futur, valider Mimetype, taille, scanner antivirus (ClamAV) et stocker hors racine.
10. Secrets: vérifier que clés (RESEND, RECAPTCHA) ne sont jamais exposées dans le client; conserver dans variables d’environnement.

### Vérification Rapide (Checklist)
| Domaine | OK | Action Future |
|---------|----|---------------|
| Validation schéma | ✅ | Étendre à tous endpoints restants |
| Sanitation basique | ✅ | Ajouter liste blanche caractères avancés si besoin |
| Rôles & permissions | ✅ | Ajouter tests automatiques |
| Logs actions critiques | ✅ | Ajouter logs pour échecs validation |
| Rate limiting | ❌ | Implémenter Redis token bucket |
| CSP/Headers | ❌ | Ajouter middleware sécurité |
| Force mot de passe | ❌ | Intégrer zxcvbn + policy |
| Monitoring | ❌ | Dashboard Grafana / alerts |

### Exemple Middleware Sécurité (proposition)
```ts
// middleware.security.ts (exemple futur)
import { NextResponse } from 'next/server'
export function middleware(req: Request) {
  const res = NextResponse.next()
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(), camera=()')
  return res
}
```

### Comment Contribuer
- Ajouter tout nouveau endpoint avec schéma Zod dans `lib/validation.ts`.
- Ne jamais faire confiance aux validations du client: toujours revalider côté serveur.
- Limiter les champs retournés (pas de mot de passe, ni données sensibles inutiles).

---
Dernière mise à jour: (automatique) Révision initiale.