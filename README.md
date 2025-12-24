<p align="center">
  <img src="public/images/logo.png" alt="Sweet Narcisse Logo" width="200"/>
</p>

<h1 align="center">🚣 Sweet Narcisse</h1>

<p align="center">
  <strong>Système de réservation de barques pour la Petite Venise de Colmar</strong>
</p>

<p align="center">
  <a href="#fonctionnalités">Fonctionnalités</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#installation">Installation</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#licence">Licence</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.6-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/Next.js-16.1.0-black.svg" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/license-Proprietary-red.svg" alt="License"/>
</p>

---

## 📋 À Propos

**Sweet Narcisse** est une plateforme complète de gestion de réservations pour les promenades en barque sur les canaux de la Petite Venise à Colmar, en Alsace. Le système gère l'ensemble du cycle de vie des réservations : de la prise de rendez-vous en ligne jusqu'à l'embarquement, en passant par les paiements sécurisés.

### 🎯 Cas d'Usage

- **Clients** : Réservation en ligne avec choix du créneau, paiement sécurisé (CB, Apple Pay, Google Pay, PayPal)
- **Employés** : Gestion quotidienne des embarquements, scan QR, encaissement sur place (Tap to Pay)
- **Administrateurs** : Planning, statistiques, gestion de flotte, comptabilité

---

## ✨ Fonctionnalités

### 🌐 Application Web

| Module | Description |
|--------|-------------|
| **Réservation en ligne** | Widget de réservation multi-étapes avec sélection de date, nombre de passagers, et créneau horaire |
| **Paiement sécurisé** | Intégration Stripe (CB, Apple Pay, Google Pay) + PayPal |
| **Multi-langue** | Interface disponible en 🇫🇷 FR, 🇬🇧 EN, 🇩🇪 DE, 🇪🇸 ES, 🇮🇹 IT |
| **Planning interactif** | Vue calendrier avec drag & drop, gestion des créneaux et de la capacité |
| **Gestion de flotte** | Suivi des barques, maintenance, disponibilité |
| **Tableau de bord** | Statistiques temps réel, météo, alertes |
| **CMS intégré** | Gestion du contenu, images hero, partenaires |

### 📱 Application Mobile (Android)

| Fonctionnalité | Description |
|----------------|-------------|
| **Scan QR** | Validation des réservations par code QR |
| **Tap to Pay** | Encaissement sans contact via Stripe Terminal SDK |
| **Mode hors-ligne** | Cache local pour consultation |
| **Notifications push** | Alertes de nouvelles réservations |

### 🔧 Administration

| Outil | Description |
|-------|-------------|
| **Gestion des employés** | Rôles, permissions, horaires |
| **Comptabilité** | Rapportations, export CSV, rapprochement bancaire |
| **Logs & Audit** | Traçabilité complète des actions |
| **Monitoring** | Prometheus + Grafana intégrés |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   Web App    │  Mobile PWA  │ Android App  │   API Externe     │
│   (Next.js)  │   (React)    │  (Capacitor) │    (REST)         │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
       └──────────────┴──────────────┴────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Reverse Proxy   │
                    │      (Nginx)      │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Next.js App     │
                    │  (API + SSR/SSG)  │
                    └─────────┬─────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
│ PostgreSQL  │       │    Redis    │       │    MinIO    │
│  (Prisma)   │       │   (Cache)   │       │  (Storage)  │
└─────────────┘       └─────────────┘       └─────────────┘

                    Services Externes
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
│   Stripe    │       │   PayPal    │       │   Resend    │
│  (Paiement) │       │  (Paiement) │       │   (Email)   │
└─────────────┘       └─────────────┘       └─────────────┘
```

### Stack Technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Prisma ORM |
| **Base de données** | PostgreSQL 16 |
| **Cache** | Redis (Upstash) |
| **Stockage fichiers** | MinIO (S3-compatible) |
| **Paiements** | Stripe (Terminal SDK, Payment Element), PayPal |
| **Mobile natif** | Capacitor + Java (Android) |
| **Infrastructure** | Docker, Docker Compose, Nginx |
| **Monitoring** | Prometheus, Grafana, Alertmanager |
| **CI/CD** | GitHub Actions |

---

## 🚀 Installation

### Prérequis

- Node.js ≥ 22
- npm ≥ 10
- Docker ≥ 24
- PostgreSQL 16 (ou via Docker)

### Installation Rapide (Développement)

```bash
# Cloner le dépôt
git clone https://github.com/kalicatt/SweetNarcisse-demo.git
cd SweetNarcisse-demo

# Installer les dépendances
npm install --legacy-peer-deps

# Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés API

# Initialiser la base de données
npx prisma migrate dev
npx prisma db seed

# Lancer le serveur de développement
npm run dev
```

### Déploiement Production (Docker)

```bash
# Créer le réseau Docker
docker network create sweetnarcisse-net

# Démarrer la base de données
docker compose -f docker-compose.db.yml up -d

# Construire et démarrer l'application
docker compose up -d --build

# Appliquer les migrations
docker compose exec app npx prisma migrate deploy
```

📖 Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour le guide complet de déploiement VPS.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📘 Guide Utilisateur](docs/user-guide.md) | Manuel pour administrateurs et employés |
| [🔧 Guide Développeur](docs/developer-guide.md) | Architecture, conventions, API |
| [🏛️ Architecture](docs/ARCHITECTURE.md) | Schémas et diagrammes techniques |
| [🚀 Déploiement](DEPLOYMENT.md) | Installation VPS, Docker, SSL |
| [🔐 Sécurité](SECURITY.md) | Politique de sécurité, signalement |
| [📝 Changelog](CHANGELOG.md) | Historique des versions |
| [🔌 API Reference](docs/api-reference.md) | Documentation OpenAPI |

---

## 🔒 Sécurité

- ✅ Authentification NextAuth avec sessions sécurisées
- ✅ Validation Zod sur toutes les entrées utilisateur
- ✅ Protection CSRF intégrée
- ✅ Rate limiting sur les endpoints sensibles
- ✅ Chiffrement des données sensibles
- ✅ Audit trail complet des actions

Pour signaler une vulnérabilité, consultez [SECURITY.md](SECURITY.md).

---

## 📊 Statut du Projet

| Composant | Statut |
|-----------|--------|
| Application Web | ✅ Production |
| API REST | ✅ Production |
| Application Android | ✅ Production |
| Application iOS | 🚧 En développement |
| PWA | ✅ Production |

---

## 🧪 Tests

```bash
# Linter
npm run lint

# Tests unitaires
npm test

# Build de vérification
npm run build
```

---

## 👨‍💻 Auteur

**Lucas Servais**

- 📧 Email: servaislucas68@gmail.com
- 🔗 GitHub: [@kalicatt](https://github.com/kalicatt)
- 📍 Colmar, Alsace, France

---

## 📄 Licence

**Copyright © 2024-2025 Lucas Servais. Tous droits réservés.**

Ce logiciel est la propriété exclusive de Lucas Servais. Toute reproduction, distribution, modification ou utilisation commerciale sans autorisation écrite préalable est strictement interdite.

Voir [LICENSE](LICENSE) pour plus de détails.

---

<p align="center">
  Fait avec ❤️ à Colmar, Alsace 🇫🇷
</p>

