# 📦 Processus de Release - Sweet Narcisse

Ce document décrit le processus complet de release et de déploiement automatique de l'application Sweet Narcisse.

## 🎯 Vue d'ensemble

Le déploiement en production est entièrement automatisé via GitHub Actions et se déclenche lors de la création d'un tag Git avec un numéro de version sémantique (SemVer).

## 📋 Prérequis

### Secrets GitHub configurés

Les secrets suivants doivent être configurés dans le repository GitHub (Settings → Secrets and variables → Actions):

```yaml
VPS_HOST        # Adresse IP ou hostname du serveur VPS
VPS_PORT        # Port SSH (généralement 22)
VPS_USER        # Utilisateur SSH
VPS_SSH_KEY     # Clé privée SSH pour l'authentification
DB_USER         # Utilisateur PostgreSQL
DB_PASSWORD     # Mot de passe PostgreSQL
DB_NAME         # Nom de la base de données
```

### Structure sur le serveur VPS

```bash
/opt/sweetnarcisse/
├── .env.production.local  # Variables d'environnement production
├── docker-compose.yml     # Configuration Docker Compose
├── prisma/               # Schéma et migrations Prisma
└── ...                   # Code de l'application
```

## 🚀 Processus de Release

### 1. Préparation de la release

Avant de créer une release, assurez-vous que:
- ✅ Tous les tests passent (`npm test`, `npm run test:e2e`)
- ✅ Le build fonctionne (`npm run build`)
- ✅ Les migrations de base de données sont prêtes
- ✅ Le CHANGELOG est à jour avec les modifications
- ✅ La documentation est à jour
- ✅ Le code est poussé sur `master`

### 2. Création du tag de version

Le système utilise le **Semantic Versioning** (SemVer):
- **MAJOR** (X.0.0) : changements incompatibles avec l'API
- **MINOR** (0.X.0) : nouvelles fonctionnalités rétrocompatibles
- **PATCH** (0.0.X) : corrections de bugs

#### Commandes pour créer un tag

```bash
# Pour une nouvelle fonctionnalité (Minor)
git tag -a v1.1.0 -m "Release 1.1.0 - E2E tests et CI/CD"

# Pour une correction de bug (Patch)
git tag -a v1.0.1 -m "Release 1.0.1 - Fix booking validation"

# Pour un changement majeur (Major)
git tag -a v2.0.0 -m "Release 2.0.0 - New API version"

# Pousser le tag vers GitHub (déclenche le déploiement)
git push origin v1.1.0
```

#### Syntaxe alternative avec une seule ligne

```bash
# Créer et pousser le tag en une fois
git tag -a v1.1.0 -m "Release 1.1.0" && git push origin v1.1.0
```

### 3. Déploiement automatique

Une fois le tag poussé, GitHub Actions exécute automatiquement le workflow `.github/workflows/deploy.yml`:

#### Pipeline de déploiement

```yaml
Job 1: Prepare
├── Extraction du numéro de version depuis le tag
├── Validation du format SemVer
└── Output: version et tag pour les jobs suivants

Job 2: Deploy
├── Connexion SSH au serveur VPS
├── Fetch des derniers tags Git
├── Checkout du tag spécifique
├── Build et redémarrage des containers Docker
├── Exécution des migrations Prisma
├── Nettoyage des anciennes images Docker
└── Health check de l'application

Job 3: Create Release
├── Génération automatique du changelog
├── Création d'une GitHub Release
└── Publication des notes de release

Job 4: Notify
└── Notification de succès/échec
```

#### Durée estimée
- **Préparation**: ~30 secondes
- **Déploiement**: ~2-3 minutes
- **Release GitHub**: ~30 secondes
- **Total**: ~3-4 minutes

### 4. Vérification post-déploiement

Après le déploiement, vérifiez automatiquement:

#### Health check automatique
Le workflow effectue un health check sur `https://www.sweet-narcisse.com/api/health`

#### Vérifications manuelles recommandées
```bash
# 1. Vérifier la version déployée
curl https://www.sweet-narcisse.com/api/health

# 2. Vérifier les logs du serveur
ssh user@vps-host "cd /opt/sweetnarcisse && docker compose logs --tail=100 app"

# 3. Vérifier que les containers tournent
ssh user@vps-host "docker ps"

# 4. Tester une réservation de bout en bout
# (via l'interface web ou tests E2E)
```

## 📊 Monitoring du déploiement

### Via GitHub Actions UI

1. Aller sur https://github.com/kalicatt/SweetNarcisse-demo/actions
2. Cliquer sur le workflow "Deploy to Production"
3. Suivre l'exécution en temps réel

### Logs détaillés

Chaque étape du déploiement génère des logs détaillés:
- 📦 Préparation de la release
- 🚀 Déploiement sur le VPS
- 🗄️ Migrations de base de données
- 🏥 Health check
- 🎉 Création de la release GitHub

## ❌ En cas d'échec

### Rollback automatique

Le workflow **ne fait pas** de rollback automatique pour éviter des régressions non désirées.

### Rollback manuel

Si le déploiement échoue ou introduit des bugs:

```bash
# 1. Se connecter au serveur
ssh user@vps-host

# 2. Aller dans le répertoire de l'application
cd /opt/sweetnarcisse

# 3. Trouver la version précédente
git tag --sort=-v:refname | head -n 2

# 4. Checkout de la version précédente (ex: v1.0.0)
git checkout tags/v1.0.0

# 5. Redémarrer les containers
docker compose --env-file .env.production.local up -d --build app

# 6. Vérifier le health check
curl -f https://www.sweet-narcisse.com/api/health

# 7. Si nécessaire, rollback les migrations DB
docker compose exec app npx prisma migrate resolve --rolled-back <migration_name>
```

### Debugging

#### Vérifier les logs du déploiement
```bash
# Logs de l'application
ssh user@vps-host "docker compose logs app"

# Logs de la base de données
ssh user@vps-host "docker compose logs db"

# Logs de Nginx
ssh user@vps-host "docker compose logs nginx"
```

#### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Health check failed` | Application pas démarrée | Vérifier logs: `docker compose logs app` |
| `Migration failed` | Conflit de schéma DB | Résoudre manuellement les migrations |
| `SSH connection refused` | Secrets incorrects | Vérifier `VPS_HOST`, `VPS_PORT`, `VPS_SSH_KEY` |
| `Docker build failed` | Erreur dans Dockerfile | Tester localement: `docker build .` |
| `Database connection error` | DB_URL incorrect | Vérifier `.env.production.local` sur serveur |

## 🔐 Sécurité

### Bonnes pratiques

- ✅ Ne jamais committer `.env.production.local`
- ✅ Utiliser des secrets GitHub pour les informations sensibles
- ✅ Rotation régulière des clés SSH
- ✅ Limiter l'accès SSH au strict nécessaire
- ✅ Utiliser des connexions HTTPS uniquement

### Audit trail

Chaque déploiement est tracé:
- GitHub Actions logs (conservés 90 jours)
- Git tags avec messages de commit
- GitHub Releases avec changelog automatique

## 📈 Stratégie de versioning

### Exemples de numérotation

```
v1.0.0 → v1.0.1  # Bug fix
v1.0.1 → v1.1.0  # Nouvelle fonctionnalité
v1.1.0 → v2.0.0  # Breaking change
v2.0.0 → v2.0.1  # Hot fix
```

### Convention de messages de tag

```bash
# Template
git tag -a vX.Y.Z -m "Release X.Y.Z - [Type]: Description courte"

# Exemples
git tag -a v1.1.0 -m "Release 1.1.0 - feat: E2E tests avec Playwright"
git tag -a v1.0.1 -m "Release 1.0.1 - fix: Validation formulaire de contact"
git tag -a v2.0.0 -m "Release 2.0.0 - breaking: Nouvelle API de réservation"
```

## 📚 Checklist de release

### Avant la release

- [ ] Tests unitaires passent (`npm test`)
- [ ] Tests E2E passent (`npm run test:e2e`)
- [ ] Build réussi (`npm run build`)
- [ ] ROADMAP.md mis à jour
- [ ] CHANGELOG.md mis à jour
- [ ] Documentation à jour
- [ ] Code review effectué
- [ ] Migrations DB testées en staging
- [ ] Performance vérifiée

### Pendant la release

- [ ] Tag créé avec bon numéro de version
- [ ] Tag poussé vers GitHub
- [ ] Workflow GitHub Actions démarre
- [ ] Jobs passent sans erreur
- [ ] Health check réussi

### Après la release

- [ ] Version déployée vérifiée
- [ ] Tests de fumée en production
- [ ] Monitoring vérifié (logs, métriques)
- [ ] GitHub Release créée
- [ ] Communication auprès de l'équipe
- [ ] Backup de la DB effectué

## 🛠️ Maintenance

### Nettoyage des anciennes versions

```bash
# Sur le serveur VPS
ssh user@vps-host

# Nettoyage des images Docker inutilisées
docker image prune -a -f

# Nettoyage des volumes Docker inutilisés
docker volume prune -f

# Nettoyage des anciens tags Git locaux
git fetch --prune --tags
```

### Mise à jour des dépendances

Avant chaque release majeure:
```bash
npm outdated
npm update
npm audit fix
```

## 📞 Support

En cas de problème:
1. Vérifier les logs GitHub Actions
2. Vérifier les logs du serveur VPS
3. Consulter cette documentation
4. Contacter l'équipe DevOps

---

**Dernière mise à jour**: 22 décembre 2025  
**Version du document**: 1.0.0  
**Auteur**: Équipe Sweet Narcisse
