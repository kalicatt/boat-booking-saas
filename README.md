<p align="center">
  <img src="public/images/logo.png" alt="Sweet Narcisse Logo" width="200"/>
</p>

<h1 align="center">🚣 Sweet Narcisse</h1>

<p align="center">
  <strong>Plateforme complète de réservation - Promenades en barque à Colmar</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.0-black?logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/Stripe-Integrated-635BFF?logo=stripe" alt="Stripe"/>
</p>

<p align="center">
  <a href="#-présentation">Présentation</a> •
  <a href="#-compétences-démontrées">Compétences</a> •
  <a href="#-fonctionnalités">Fonctionnalités</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-captures-décran">Screenshots</a>
</p>

---

## 👨‍💻 À Propos du Développeur

<table>
<tr>
<td width="150">

**Lucas Servais**

Développeur Full-Stack

</td>
<td>

📍 Colmar, Alsace, France  
📧 servaislucas68@gmail.com  
🔗 [GitHub @kalicatt](https://github.com/kalicatt)

</td>
</tr>
</table>

> Ce projet représente **+1 an de développement** et constitue une solution complète en production, utilisée par une entreprise réelle de promenades en barque à Colmar.

---

## 🎯 Présentation

**Sweet Narcisse** est une plateforme SaaS complète de gestion de réservations que j'ai développée de A à Z pour une entreprise locale. Le système couvre l'intégralité du parcours client et des besoins métier :

- 🌐 **Site web** avec réservation en ligne multi-langue
- 💳 **Paiements sécurisés** (Stripe, PayPal, Apple Pay, Google Pay)
- 📱 **Application mobile Android** pour les employés (scan QR, encaissement Tap to Pay)
- 📊 **Back-office complet** (planning, statistiques, comptabilité)
- 🔐 **Gestion des accès** par rôles (admin, manager, employé)

---

## 🛠️ Compétences Démontrées

### Frontend
| Technologie | Utilisation |
|-------------|-------------|
| **React 19** | Composants fonctionnels, hooks avancés, Server Components |
| **Next.js 16** | App Router, SSR/SSG, API Routes, Middleware |
| **TypeScript** | Typage strict, interfaces, génériques |
| **Tailwind CSS** | Design responsive, dark mode, animations |

### Backend
| Technologie | Utilisation |
|-------------|-------------|
| **Next.js API** | REST API, webhooks, authentification |
| **Prisma ORM** | Modélisation, migrations, transactions |
| **PostgreSQL** | Requêtes complexes, index, optimisations |
| **Redis** | Cache, sessions, rate limiting |

### Intégrations
| Service | Implémentation |
|---------|----------------|
| **Stripe** | Payment Intents, Terminal SDK (Tap to Pay), Webhooks |
| **PayPal** | SDK intégration, gestion des commandes |
| **Emails** | Templates React Email, envoi transactionnel (Resend) |
| **Stockage** | MinIO (S3-compatible), upload sécurisé |

### DevOps & Infrastructure
| Domaine | Technologies |
|---------|--------------|
| **Containerisation** | Docker, Docker Compose |
| **Reverse Proxy** | Nginx, SSL/TLS |
| **Monitoring** | Prometheus, Grafana, alertes |
| **CI/CD** | GitHub Actions, déploiement automatisé |
| **VPS** | Configuration serveur, sécurité Linux |

### Mobile
| Technologie | Utilisation |
|-------------|-------------|
| **Capacitor** | Bridge natif, plugins customs |
| **Android/Java** | Intégration Stripe Terminal SDK natif |

### Bonnes Pratiques
- ✅ Architecture clean et modulaire
- ✅ Validation des données (Zod)
- ✅ Gestion d'erreurs centralisée
- ✅ Logging structuré
- ✅ Tests automatisés
- ✅ Documentation complète
- ✅ Sécurité (CSRF, XSS, rate limiting, RGPD)

---

## ✨ Fonctionnalités

### 🌐 Application Web Client

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Landing Page                                            │
│  ├── Hero dynamique avec images CMS                        │
│  ├── Widget de réservation multi-étapes                    │
│  ├── Galerie photos                                        │
│  ├── Avis clients (intégration externe)                    │
│  └── Partenaires                                           │
├─────────────────────────────────────────────────────────────┤
│  📅 Réservation                                             │
│  ├── Sélection date/heure avec disponibilités temps réel   │
│  ├── Calcul automatique des tarifs                         │
│  ├── Formulaire client avec validation                     │
│  ├── Paiement sécurisé (CB, Apple Pay, Google Pay, PayPal) │
│  └── Confirmation par email avec QR code                   │
├─────────────────────────────────────────────────────────────┤
│  🌍 Multi-langue                                            │
│  └── FR 🇫🇷 | EN 🇬🇧 | DE 🇩🇪 | ES 🇪🇸 | IT 🇮🇹              │
└─────────────────────────────────────────────────────────────┘
```

### 🔧 Back-Office Administration

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Dashboard                                               │
│  ├── KPIs temps réel (CA, réservations, taux remplissage)  │
│  ├── Météo intégrée                                        │
│  └── Alertes et notifications                              │
├─────────────────────────────────────────────────────────────┤
│  📅 Planning                                                │
│  ├── Vue calendrier drag & drop                            │
│  ├── Gestion des créneaux horaires                         │
│  ├── Capacité par barque                                   │
│  └── Visualisation PENDING/CONFIRMED                       │
├─────────────────────────────────────────────────────────────┤
│  🚣 Gestion Flotte                                          │
│  ├── CRUD barques                                          │
│  ├── Statut maintenance                                    │
│  └── Capacité et caractéristiques                          │
├─────────────────────────────────────────────────────────────┤
│  👥 Gestion Utilisateurs                                    │
│  ├── Rôles : SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE         │
│  ├── Permissions granulaires                               │
│  └── Historique des actions (audit trail)                  │
├─────────────────────────────────────────────────────────────┤
│  💰 Comptabilité                                            │
│  ├── Rapprochement bancaire Stripe/PayPal                  │
│  ├── Export CSV                                            │
│  ├── Factures PDF générées automatiquement                 │
│  └── TVA et déclarations                                   │
├─────────────────────────────────────────────────────────────┤
│  🎨 CMS                                                     │
│  ├── Gestion images hero                                   │
│  ├── Partenaires                                           │
│  └── Contenus dynamiques                                   │
└─────────────────────────────────────────────────────────────┘
```

### 📱 Application Mobile Employés

```
┌─────────────────────────────────────────────────────────────┐
│  📷 Scan QR                                                 │
│  └── Validation instantanée des réservations               │
├─────────────────────────────────────────────────────────────┤
│  💳 Tap to Pay                                              │
│  ├── Encaissement sans contact (NFC)                       │
│  ├── Stripe Terminal SDK natif                             │
│  └── Création réservation + paiement en une action         │
├─────────────────────────────────────────────────────────────┤
│  📋 Liste Réservations                                      │
│  └── Vue journalière avec statuts                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   Web App    │     PWA      │ Android App  │   API Externe     │
│   (Next.js)  │   (React)    │  (Capacitor) │    (REST)         │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
       └──────────────┴──────────────┴────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Reverse Proxy   │
                    │      (Nginx)      │
                    │   SSL/TLS + GZIP  │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Next.js 16      │
                    │  ┌─────────────┐  │
                    │  │ App Router  │  │
                    │  │ API Routes  │  │
                    │  │ Middleware  │  │
                    │  └─────────────┘  │
                    └─────────┬─────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
│ PostgreSQL  │       │    Redis    │       │    MinIO    │
│   16        │       │   (Cache)   │       │  (S3)       │
│  + Prisma   │       │  + Sessions │       │  + Images   │
└─────────────┘       └─────────────┘       └─────────────┘
```

### Stack Technique Complète

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 3 |
| **State Management** | React Context, Server State |
| **Backend** | Next.js API Routes, Server Actions |
| **ORM** | Prisma 6 |
| **Base de données** | PostgreSQL 16 |
| **Cache & Sessions** | Redis (Upstash) |
| **Authentification** | NextAuth.js v5, JWT, bcrypt |
| **Validation** | Zod |
| **Stockage fichiers** | MinIO (S3-compatible) |
| **Paiements** | Stripe (Payment Intents, Terminal SDK), PayPal SDK |
| **Emails** | React Email + Resend |
| **PDF** | React-PDF |
| **QR Codes** | qrcode.react |
| **Mobile** | Capacitor 6, Android SDK |
| **Containerisation** | Docker, Docker Compose |
| **Reverse Proxy** | Nginx |
| **Monitoring** | Prometheus, Grafana, custom metrics |
| **CI/CD** | GitHub Actions |

---

## 📁 Structure du Projet

```
sweet-narcisse/
├── app/                    # Next.js App Router
│   ├── [lang]/            # Routes internationalisées
│   │   ├── page.tsx       # Landing page
│   │   └── ...
│   ├── admin/             # Back-office
│   │   ├── dashboard/
│   │   ├── planning/
│   │   ├── boats/
│   │   ├── users/
│   │   └── ...
│   └── api/               # API REST
│       ├── auth/
│       ├── bookings/
│       ├── payments/
│       └── webhooks/
├── components/            # Composants React
├── lib/                   # Logique métier
│   ├── actions.ts         # Server Actions
│   ├── prisma.ts         # Client Prisma
│   ├── stripe.ts         # Config Stripe
│   └── ...
├── prisma/
│   ├── schema.prisma     # Modèle de données
│   └── migrations/       # Migrations SQL
├── dictionaries/         # Traductions i18n
├── android/              # App Capacitor Android
├── docker-compose.yml    # Orchestration containers
└── docs/                 # Documentation
```

---

## 📈 Métriques du Projet

| Métrique | Valeur |
|----------|--------|
| **Lignes de code** | ~30,000+ |
| **Composants React** | 50+ |
| **Endpoints API** | 40+ |
| **Tables DB** | 15+ |
| **Temps de développement** | +1 an |
| **Statut** | ✅ En production |

---

## 📸 Captures d'Écran

> *Les captures d'écran sont disponibles sur demande pour préserver la confidentialité du client.*

### Aperçu des Interfaces

- **Landing Page** : Design moderne, widget réservation intégré
- **Processus de réservation** : UX fluide en 4 étapes
- **Planning admin** : Vue calendrier avec drag & drop
- **Dashboard** : KPIs et graphiques temps réel
- **App mobile** : Interface native Android

---

## 🔐 Sécurité Implémentée

| Mesure | Implémentation |
|--------|----------------|
| **Authentification** | NextAuth.js avec sessions JWT sécurisées |
| **Autorisation** | RBAC (Role-Based Access Control) |
| **Validation** | Zod sur toutes les entrées utilisateur |
| **Protection CSRF** | Tokens automatiques Next.js |
| **Rate Limiting** | Par IP et par utilisateur |
| **XSS Prevention** | Sanitization + CSP headers |
| **SQL Injection** | Prisma ORM (requêtes paramétrées) |
| **RGPD** | Consentement, droit à l'oubli, export données |
| **Audit Trail** | Log de toutes les actions sensibles |
| **HTTPS** | TLS 1.3 obligatoire |

---

## 📚 Documentation Technique

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Diagrammes et flux de données |
| [Guide Utilisateur](docs/user-guide.md) | Manuel complet back-office |
| [Déploiement](DEPLOYMENT.md) | Guide VPS et Docker |
| [Sécurité](SECURITY.md) | Politique de sécurité |
| [Changelog](CHANGELOG.md) | Historique des versions |

---

## 🚀 Exécution Locale

```bash
# Cloner le repository
git clone https://github.com/kalicatt/SweetNarcisse-demo.git
cd SweetNarcisse-demo

# Installer les dépendances
npm install --legacy-peer-deps

# Variables d'environnement
cp .env.example .env.local

# Base de données (Docker)
docker compose -f docker-compose.db.yml up -d

# Migrations Prisma
npx prisma migrate dev
npx prisma db seed

# Lancer le serveur
npm run dev
```

---

## 📄 Licence & Acquisition

Ce logiciel est un **développement propriétaire** réalisé par Lucas Servais.

### 🎯 Portfolio
Ce dépôt est public pour démontrer mes compétences techniques auprès des recruteurs.

### 💼 Disponible à la Vente
Ce projet complet (code source, documentation, architecture) est **disponible à l'acquisition** ou sous licence commerciale. La marque "Sweet Narcisse" n'est pas incluse.

**Intéressé ?** Contactez-moi pour discuter des conditions.

**© 2024-2025 Lucas Servais** - Tous droits réservés  
Voir [LICENSE](LICENSE) pour plus de détails.

---

<p align="center">
  <strong>Développé avec passion à Colmar, Alsace 🇫🇷</strong>
</p>

<p align="center">
  <a href="mailto:servaislucas68@gmail.com">📧 Me contacter</a> •
  <a href="https://github.com/kalicatt">💻 Mon GitHub</a>
</p>

