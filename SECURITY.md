## Sécurité – Sweet Narcisse

Ce document résume les protections côté serveur mises en place, la procédure de signalement et les recommandations pour aller plus loin.

### Signalement de vulnérabilité
- **Contact** : envoyez un email à `security@sweet-narcisse.fr` (ou `lucas@sweet-narcisse.fr` en secours) avec un descriptif détaillé, étapes de reproduction, et tout POC.
- **Chiffrement** : la clé PGP publique est disponible dans `certs/README.md`; utilisez-la pour les rapports sensibles.
- **SLA réponse** : accusé de réception sous 2 jours ouvrés, patch correctif sous 14 jours pour les failles critiques (ou contournement documenté).
- **Divulgation responsable** : merci de ne pas rendre publiques les informations tant qu’un correctif n’est pas déployé. Nous publions ensuite la vulnérabilité et les étapes de mitigation dans `CHANGELOG.md` et `SECURITY.md`.

### Versions supportées
| Version | Statut | Notes |
|---------|--------|-------|
| 1.0.5 (master) | ✅ Supportée | Dernier correctif, docs à jour |
| < 1.0.5 | ⚠️ Best effort | Mettez à niveau avant de demander une assistance sécurité |

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
- Les scripts automatisés (`daily-maintenance.ps1`) tracent les opérations de pruning, sauvegarde et appels d’API; conservez les journaux pour 90 jours afin de faciliter l’investigation.

### Recommandations Futures
1. Rate limiting: intégrer un système (Redis / Upstash) pour limiter POST (ex: 20/min/IP).
2. CSRF: utiliser token anti-CSRF si endpoints consommés par un navigateur authentifié (NextAuth fournit protections basiques; renforcer si formulaires externes).
3. Header Policy: configurer `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` via middleware (voir proposition ci-dessous).
4. Password strength: vérifier robustesse (zxcvbn) avant création d’employé / changement de mot de passe; l’outil est déjà présent dans `package.json` (`zxcvbn`).
5. Audit logs externes: exporter les `Log` vers stockage immuable (S3 / Log service) pour non‑répudiation.
6. Monitoring sécurité: ajouter alertes sur volume anormal de 4xx ou création rapide de comptes (Grafana/Alertmanager déjà provisionnés dans `monitoring/`).
7. Chiffrement au repos: s’assurer que la base Postgres est sur un volume chiffré (paramètre hosting).
8. Séparation Permissions: futur passage à RBAC plus granulaires si modules nouveaux (ex: STATISTIQUES lecture seule). La promotion Client → Employé (1.0.5) respecte déjà les roles existants.
9. File Upload: si ajout futur, valider Mimetype, taille, scanner antivirus (ClamAV) et stocker hors racine.
10. Secrets: vérifier que clés (RESEND, RECAPTCHA) ne sont jamais exposées dans le client; conserver dans variables d’environnement. Le script `scripts/configure-env.sh` automatise cette vérification.

### Infrastructure & Ops
- Base de données isolée: `docker-compose.db.yml` exécute Postgres dans un stack dédié (`sweetnarcisse-net`) afin que les déploiements applicatifs ne touchent pas le volume `sweetnarcisse-postgres`. Limiter l’accès réseau à ce bridge uniquement.
- Gestion des secrets: `scripts/configure-env.sh` génère `.env.production.local` avec toutes les variables (Stripe, PayPal, SMTP, reCAPTCHA, Grafana). Stocker ce fichier hors dépôt git (`chmod 600`) et régénérer après rotation des clés.
- Snapshots & sauvegardes: utiliser la procédure décrite dans `DEPLOYMENT.md` (dump logique + archive du volume) et chiffrer les exports avant offsite.
- Tests PayPal sandbox: basculer `PAYPAL_MODE` en `sandbox` via le script, utiliser des identifiants dédiés, puis revenir en `live` dès la recette terminée pour limiter l’exposition des clés.

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
- Documenter les changements sécurité dans `CHANGELOG.md` et avertir `security@sweet-narcisse.fr` avant déploiement.

---
Dernière mise à jour: 2025-12-05 (release v1.0.5).