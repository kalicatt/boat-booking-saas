# 🔐 Sécurité

Ce document décrit les mesures de sécurité implémentées dans ce projet.

## Mesures Implémentées

| Domaine | Implémentation |
|---------|----------------|
| **Authentification** | NextAuth.js v5, sessions JWT sécurisées, bcrypt |
| **Autorisation** | RBAC (4 niveaux de rôles) |
| **Validation** | Zod sur toutes les entrées utilisateur |
| **Protection CSRF** | Tokens automatiques Next.js |
| **Rate Limiting** | Limitation par IP et utilisateur |
| **XSS** | Sanitization, Content Security Policy |
| **SQL Injection** | Prisma ORM (requêtes paramétrées) |
| **HTTPS** | TLS 1.3 obligatoire |
| **Audit** | Logging complet des actions sensibles |

## Conformité RGPD

- ✅ Consentement explicite aux cookies
- ✅ Droit d'accès aux données personnelles
- ✅ Droit à l'effacement ("droit à l'oubli")
- ✅ Portabilité des données (export)
- ✅ Minimisation des données collectées

## Contact

Pour toute question relative à la sécurité de ce projet :

📧 servaislucas68@gmail.com
