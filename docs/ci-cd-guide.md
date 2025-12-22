# CI/CD Pipeline - Sweet Narcisse

## Vue d'Ensemble

Ce projet utilise GitHub Actions pour l'intégration continue (CI) et le déploiement continu (CD). Le pipeline automatise les tests, la vérification du code, la construction et le déploiement de l'application.

## Structure du Pipeline

### 📋 Jobs Principaux

#### 1. **Lint** (`lint`)
- **Objectif**: Vérifier la qualité du code avec ESLint
- **Déclenchement**: Sur chaque push/PR vers `main` ou `develop`
- **Commande**: `npm run lint`
- **Durée**: ~30 secondes

#### 2. **Test** (`test`)
- **Objectif**: Exécuter tous les tests (unitaires + intégration)
- **Services**: PostgreSQL 15, Redis 7
- **Base de données de test**: `sweetnarcisse_test`
- **Commandes**:
  - `npx prisma migrate deploy` - Applique les migrations
  - `npx prisma generate` - Génère le client Prisma
  - `npm test` - Lance Vitest
- **Durée**: ~2-3 minutes

#### 3. **Build** (`build`)
- **Objectif**: Vérifier que l'application se construit sans erreur
- **Dépendances**: Nécessite que `lint` et `test` passent
- **Commande**: `npm run build`
- **Artefacts**: Build Next.js sauvegardé pendant 7 jours
- **Durée**: ~3-5 minutes

#### 4. **Type Check** (`type-check`)
- **Objectif**: Vérifier les types TypeScript
- **Commande**: `npx tsc --noEmit`
- **Durée**: ~1 minute

#### 5. **Security** (`security`)
- **Objectif**: Audit de sécurité des dépendances
- **Outils**:
  - `npm audit` - Vulnérabilités NPM
  - Snyk (optionnel) - Scan de sécurité avancé
- **Durée**: ~1 minute

#### 6. **Docker** (`docker`)
- **Objectif**: Construire et pousser l'image Docker
- **Déclenchement**: Seulement sur push vers `main`
- **Registry**: Docker Hub
- **Tags**:
  - `latest` (branche main)
  - `main-<sha>` (commit SHA)
- **Durée**: ~5-10 minutes

#### 7. **Deploy Staging** (`deploy-staging`)
- **Objectif**: Déployer sur l'environnement de staging
- **Déclenchement**: Push vers `develop`
- **URL**: https://staging.sweetnarcisse.fr

#### 8. **Deploy Production** (`deploy-production`)
- **Objectif**: Déployer en production
- **Déclenchement**: Push vers `main`
- **URL**: https://sweetnarcisse.fr
- **Protection**: Environnement protégé (nécessite approbation manuelle)

#### 9. **Notify** (`notify`)
- **Objectif**: Notifier l'équipe des résultats
- **Canal**: Slack (optionnel)
- **Déclenchement**: Toujours, même en cas d'échec

## Variables d'Environnement

### Secrets GitHub Requis

Allez dans **Settings → Secrets and variables → Actions** de votre repository GitHub et ajoutez :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `DOCKER_USERNAME` | Nom d'utilisateur Docker Hub | `mycompany` |
| `DOCKER_PASSWORD` | Token Docker Hub | `dckr_pat_xxxxx` |
| `CODECOV_TOKEN` | Token Codecov (optionnel) | `abc123...` |
| `SNYK_TOKEN` | Token Snyk (optionnel) | `xyz789...` |
| `SLACK_WEBHOOK` | Webhook Slack (optionnel) | `https://hooks.slack.com/...` |

### Variables d'Environnement de Test

Ces variables sont configurées automatiquement dans le job `test`:

```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sweetnarcisse_test
REDIS_URL: redis://localhost:6379
NEXTAUTH_SECRET: test-secret-key-for-ci
NEXTAUTH_URL: http://localhost:3000
RECAPTCHA_SECRET_KEY: test-recaptcha-secret
RESEND_API_KEY: test-resend-key
```

## Workflow de Développement

### Branche `develop` (Staging)
```bash
# 1. Créer une feature branch
git checkout -b feature/my-feature develop

# 2. Développer et commiter
git add .
git commit -m "feat: add new feature"

# 3. Push et créer une PR vers develop
git push origin feature/my-feature
```

**Pipeline déclenché sur PR**:
1. ✅ Lint
2. ✅ Tests
3. ✅ Type Check
4. ✅ Security
5. ✅ Build

**Pipeline déclenché après merge dans develop**:
1. Tous les jobs ci-dessus
2. ✅ Docker build & push (tag: `develop-<sha>`)
3. 🚀 Deploy Staging

### Branche `main` (Production)
```bash
# 1. Merger develop dans main (après tests staging OK)
git checkout main
git merge develop

# 2. Push
git push origin main
```

**Pipeline déclenché**:
1. Tous les jobs de vérification
2. ✅ Docker build & push (tags: `latest`, `main-<sha>`)
3. 🚀 Deploy Production (avec approbation manuelle)

## Configuration des Environnements GitHub

### Staging Environment
1. Allez dans **Settings → Environments**
2. Créez l'environnement `staging`
3. Ajoutez l'URL: `https://staging.sweetnarcisse.fr`
4. Pas de protection requise

### Production Environment
1. Créez l'environnement `production`
2. Ajoutez l'URL: `https://sweetnarcisse.fr`
3. **Activez "Required reviewers"** - Ajoutez au moins 1 reviewer
4. **Activez "Wait timer"** - 5 minutes de délai avant déploiement
5. **Activez "Deployment branches"** - Seulement `main`

## Déploiement Manuel (si nécessaire)

### Via GitHub Actions UI
1. Allez dans **Actions** tab
2. Sélectionnez le workflow "CI/CD Pipeline"
3. Cliquez sur "Run workflow"
4. Choisissez la branche
5. Cliquez sur "Run workflow"

### Via GitHub CLI
```bash
# Déclencher le workflow sur develop
gh workflow run ci.yml --ref develop

# Déclencher sur main
gh workflow run ci.yml --ref main
```

## Surveillance et Logs

### Voir les Logs
1. Allez dans **Actions** tab
2. Cliquez sur un workflow run
3. Cliquez sur un job pour voir les logs détaillés

### Notifications
- **Échec de tests**: Email automatique aux contributeurs
- **Échec de build**: Email + Slack (si configuré)
- **Déploiement réussi**: Slack (si configuré)

## Optimisations

### Cache NPM
- Les dépendances sont cachées automatiquement avec `cache: 'npm'`
- Accélère l'installation de ~2 minutes à ~30 secondes

### Cache Docker
- Utilise GitHub Actions cache (`type=gha`)
- Réduit le temps de build Docker de ~10 min à ~3 min

### Parallélisation
- Les jobs `lint`, `test`, `type-check`, `security` s'exécutent en parallèle
- Temps total réduit de ~10 min à ~4 min

## Badges de Statut

Ajoutez ces badges à votre README.md :

```markdown
![CI/CD](https://github.com/VOTRE_ORG/sweet-narcisse/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-81%2F86%20passing-success)
![Coverage](https://codecov.io/gh/VOTRE_ORG/sweet-narcisse/branch/main/graph/badge.svg)
```

## Dépannage

### Tests échouent en CI mais passent localement
- **Cause**: Différences d'environnement (Node version, timezone, etc.)
- **Solution**: Utiliser des conteneurs Docker pour les tests locaux
```bash
docker-compose -f docker-compose.test.yml up
```

### Build échoue avec "out of memory"
- **Cause**: Next.js build consomme beaucoup de mémoire
- **Solution**: Augmenter la limite Node
```yaml
- name: Build Next.js
  run: NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Prisma migrations échouent
- **Cause**: Schema out of sync avec migrations
- **Solution**: Regénérer les migrations
```bash
npx prisma migrate dev --name fix_schema
git add prisma/migrations
git commit -m "fix: update prisma migrations"
```

## Coûts GitHub Actions

- **Free tier**: 2000 minutes/mois pour repos privés
- **Consommation estimée**: 
  - ~4 min par PR (lint + test + build)
  - ~10 min par deploy (inclut Docker)
  - ~50 PR/mois = 200 min
  - ~20 deploys/mois = 200 min
  - **Total**: ~400 min/mois (20% du quota gratuit)

## Prochaines Améliorations

### Court Terme
- [ ] Ajouter tests E2E avec Playwright
- [ ] Coverage minimum requis (80%)
- [ ] Auto-rollback en cas d'échec de déploiement

### Moyen Terme
- [ ] Preview deployments pour chaque PR (Vercel/Netlify)
- [ ] Performance budgets (Lighthouse CI)
- [ ] Visual regression testing (Percy/Chromatic)

### Long Terme
- [ ] Blue-green deployment
- [ ] Canary deployments (10% → 50% → 100%)
- [ ] Automated load testing avant production

## Support

Pour toute question sur le CI/CD:
- 📧 Email: dev@sweetnarcisse.fr
- 💬 Slack: #ci-cd channel
- 📖 Documentation: https://docs.sweetnarcisse.fr/ci-cd

---

**Dernière mise à jour**: 22 décembre 2025  
**Version**: 1.0.0  
**Responsable CI/CD**: DevOps Team
