# Politique de Sécurité – Sweet Narcisse

Ce document décrit les mesures de sécurité implémentées, la procédure de signalement de vulnérabilités et les recommandations pour maintenir un haut niveau de protection.

---

## 📋 Table des Matières

- [Signalement de Vulnérabilité](#-signalement-de-vulnérabilité)
- [Versions Supportées](#-versions-supportées)
- [Mesures de Sécurité](#-mesures-de-sécurité)
- [Architecture de Sécurité](#-architecture-de-sécurité)
- [Conformité RGPD](#-conformité-rgpd)
- [Recommandations](#-recommandations)

---

## 🚨 Signalement de Vulnérabilité

### Contact

Si vous découvrez une faille de sécurité, veuillez nous contacter de manière responsable :

- **Email** : servaislucas68@gmail.com
- **Objet** : `[SECURITY] Description brève`
- **Chiffrement** : Clé PGP disponible dans `certs/README.md`

### Informations à Fournir

1. Description détaillée de la vulnérabilité
2. Étapes de reproduction
3. Impact potentiel
4. Proof of Concept (si disponible)
5. Suggestions de correction (optionnel)

### Délais de Réponse

| Sévérité | Accusé de réception | Correctif |
|----------|---------------------|-----------|
| **Critique** | 24 heures | 7 jours |
| **Haute** | 48 heures | 14 jours |
| **Moyenne** | 5 jours | 30 jours |
| **Basse** | 7 jours | 60 jours |

### Divulgation Responsable

- ⏳ Ne divulguez pas publiquement avant le déploiement du correctif
- 📝 Nous publions les vulnérabilités corrigées dans `CHANGELOG.md`
- 🏆 Reconnaissance dans `SECURITY.md` pour les signalements validés

---

## ✅ Versions Supportées

| Version | Statut | Support Sécurité |
|---------|--------|------------------|
| 1.0.x (master) | ✅ Active | Correctifs prioritaires |
| < 1.0.0 | ❌ Obsolète | Aucun support |

> **Recommandation** : Maintenez toujours votre installation à jour avec la dernière version stable.

---

## 🔐 Mesures de Sécurité

### Authentification & Autorisation

| Mesure | Implémentation |
|--------|----------------|
| **Sessions** | NextAuth.js avec tokens JWT signés |
| **Mots de passe** | Hashage bcrypt (cost factor 12) |
| **Rôles** | RBAC (SUPERADMIN, ADMIN, EMPLOYEE, CLIENT) |
| **Permissions** | Granulaires par fonctionnalité |

```
Hiérarchie des rôles:
SUPERADMIN → Accès total, gestion des admins
    └── ADMIN → Gestion employés, réservations, flotte
        └── EMPLOYEE → Embarquements, scan QR, encaissement
            └── CLIENT → Réservations personnelles
```

### Validation des Entrées

- **Zod** : Schémas de validation sur toutes les API
- **Sanitization** : Nettoyage des caractères spéciaux
- **Longueur** : Limites strictes sur tous les champs texte
- **XSS** : Suppression des balises `<script>` dans les champs libres

### Protection des API

| Protection | Endpoint | Configuration |
|------------|----------|---------------|
| Rate Limiting | `/api/*` | 100 req/min/IP |
| Rate Limiting | `/api/auth/*` | 10 req/min/IP |
| CORS | Tous | Origines whitelist |
| CSRF | Mutations | Token automatique NextAuth |

### Sécurité des Paiements

- **Stripe** : PCI DSS Level 1 certifié
- **PayPal** : Tokenisation sécurisée
- **Webhooks** : Vérification de signature obligatoire
- **3D Secure** : Activé par défaut

### Base de Données

| Mesure | Description |
|--------|-------------|
| **ORM** | Prisma (requêtes paramétrées, pas d'injection SQL) |
| **Connexion** | SSL/TLS obligatoire |
| **Backups** | Quotidiens, rétention 30 jours |
| **Accès** | Réseau Docker isolé |

### Journalisation & Audit

Toutes les actions critiques sont tracées :

- Création/modification/suppression de réservations
- Authentifications (succès et échecs)
- Opérations de paiement
- Modifications de permissions
- Actions administratives

---

## 🏛️ Architecture de Sécurité

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERNET                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │      Cloudflare       │  ← DDoS Protection
              │    (WAF, Rate Limit)  │  ← SSL Termination
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │        Nginx          │  ← Reverse Proxy
              │   (HTTPS, Headers)    │  ← Security Headers
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │      Next.js App      │  ← Application
              │  (Auth, Validation)   │  ← Business Logic
              └───────────┬───────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼────────┐ ┌─────▼─────┐ ┌───────▼───────┐
│   PostgreSQL    │ │   Redis   │ │     MinIO     │
│   (Encrypted)   │ │  (Cache)  │ │   (Storage)   │
└─────────────────┘ └───────────┘ └───────────────┘
         │
         └── Réseau Docker isolé (sweetnarcisse-net)
```

### Headers de Sécurité Configurés

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000`

---

## 🇪🇺 Conformité RGPD

### Données Collectées

| Catégorie | Données | Finalité | Rétention |
|-----------|---------|----------|-----------|
| Identité | Nom, prénom | Réservation | 3 ans |
| Contact | Email, téléphone | Communication | 3 ans |
| Paiement | Référence transaction | Comptabilité | 10 ans |
| Technique | IP, User-Agent | Sécurité | 1 an |

### Droits des Utilisateurs

- ✅ **Accès** : Export des données via `/api/user/export`
- ✅ **Rectification** : Modification via profil utilisateur
- ✅ **Suppression** : Demande via `/api/user/delete`
- ✅ **Portabilité** : Export JSON/CSV disponible

### Mesures Techniques

- Chiffrement des données sensibles au repos
- Pseudonymisation des logs après 90 jours
- Accès limité aux données personnelles (need-to-know)
- Contrats de sous-traitance avec Stripe, PayPal, hébergeur

---

## 💡 Recommandations

### Pour les Administrateurs

1. **Mots de passe** : Minimum 12 caractères, complexité requise
2. **Sessions** : Déconnexion automatique après 30 min d'inactivité
3. **Audit** : Revue mensuelle des logs d'accès

### Pour les Développeurs

1. **Dépendances** : `npm audit` avant chaque release
2. **Secrets** : Jamais dans le code, utiliser `.env`
3. **Code review** : Obligatoire pour toute modification sécurité

### Pour l'Infrastructure

1. **Updates** : Patcher l'OS et Docker mensuellement
2. **Firewall** : Seuls ports 80/443 exposés
3. **Backups** : Tester la restauration trimestriellement

---

## 📜 Historique des Vulnérabilités Corrigées

| Date | Sévérité | Description | Version corrigée |
|------|----------|-------------|------------------|
| - | - | Aucune vulnérabilité signalée | - |

---

## 🙏 Remerciements

Merci aux chercheurs en sécurité qui ont contribué à améliorer Sweet Narcisse.

---

**Dernière mise à jour** : Décembre 2025  
**Propriétaire** : Lucas Servais  
**Contact** : servaislucas68@gmail.com
