# Runbooks Opérationnels - Sweet Narcisse

> **Version**: 1.0  
> **Dernière mise à jour**: 22 décembre 2025  
> **Auteur**: Équipe DevOps

Ce document contient les procédures opérationnelles standard pour la gestion de l'infrastructure Sweet Narcisse.

---

## Table des matières

1. [Incident Response](#incident-response)
2. [Deployment & Rollback](#deployment--rollback)
3. [Database Operations](#database-operations)
4. [Cache Management](#cache-management)
5. [Scaling Guide](#scaling-guide)
6. [Maintenance Procedures](#maintenance-procedures)

---

## 1. Incident Response

### 1.1 Processus de Réponse

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. DÉTECTION → 2. TRIAGE → 3. DIAGNOSTIC → 4. RÉSOLUTION → 5. POSTMORTEM │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Classification des Incidents

| Sévérité | Impact | Temps de réponse | Exemples |
|----------|--------|------------------|----------|
| SEV1 | Service DOWN | < 15 min | App inaccessible, DB down |
| SEV2 | Dégradation majeure | < 30 min | Paiements impossibles |
| SEV3 | Dégradation mineure | < 2h | Cache down, lenteurs |
| SEV4 | Bug mineur | < 24h | Affichage incorrect |

### 1.3 Checklist Incident SEV1

```bash
# 1. Vérifier le statut de l'application
curl -s https://www.sweet-narcisse.com/api/health?verbose=true | jq

# 2. Vérifier les containers
ssh -p 5522 root@51.178.17.205 "docker ps -a"

# 3. Consulter les logs récents
ssh -p 5522 root@51.178.17.205 "docker compose logs --tail=100 app"

# 4. Vérifier l'espace disque
ssh -p 5522 root@51.178.17.205 "df -h"

# 5. Vérifier la base de données
ssh -p 5522 root@51.178.17.205 "docker compose exec db psql -U postgres -c 'SELECT 1'"
```

### 1.4 Contacts d'Urgence

| Rôle | Contact | Disponibilité |
|------|---------|---------------|
| On-call primaire | alerte@sweet-narcisse.com | 24/7 |
| Escalation | direction@sweet-narcisse.com | 9h-18h |
| Hébergeur (OVH) | support.ovh.com | 24/7 |

---

## 2. Deployment & Rollback

### 2.1 Déploiement Standard

```bash
# Via tag Git (méthode recommandée)
git tag -a v1.X.Y -m "Release 1.X.Y - Description"
git push origin v1.X.Y

# Le pipeline GitHub Actions se déclenche automatiquement
# Suivre: https://github.com/kalicatt/SweetNarcisse-demo/actions
```

### 2.2 Déploiement Manuel (Urgence)

```bash
# SSH vers le serveur
ssh -p 5522 root@51.178.17.205

# Aller au répertoire
cd /opt/sweetnarcisse

# Pull et redémarrer
git pull origin master
docker compose pull
docker compose up -d

# Vérifier
docker compose ps
curl -s localhost:3000/api/health
```

### 2.3 Rollback

```bash
# Identifier la version précédente
git log --oneline -10

# Checkout de la version stable
git checkout v1.X.Y-1

# Rebuild et redémarrer
docker compose build app
docker compose up -d app

# Vérifier le health check
curl -s https://www.sweet-narcisse.com/api/health
```

### 2.4 Rollback Migrations DB

```bash
# ⚠️ ATTENTION: Opération dangereuse

# 1. Backup avant toute chose
pg_dump -h localhost -U postgres sweet_narcisse > pre_rollback_$(date +%Y%m%d_%H%M%S).sql

# 2. Identifier la migration à rollback
npx prisma migrate status

# 3. Rollback manuel (Prisma ne supporte pas le rollback auto)
# Écrire et exécuter le script SQL inverse
psql -h localhost -U postgres sweet_narcisse < rollback_migration_xxx.sql

# 4. Marquer la migration comme rollback
npx prisma migrate resolve --rolled-back "migration_name"
```

---

## 3. Database Operations

### 3.1 Connexion à la Base

```bash
# Via Docker
docker compose exec db psql -U postgres sweet_narcisse

# Direct (si exposé)
psql -h localhost -p 5432 -U postgres sweet_narcisse
```

### 3.2 Backup Manuel

```bash
# Backup complet
pg_dump -h localhost -U postgres -Fc sweet_narcisse > backup_$(date +%Y%m%d_%H%M%S).dump

# Backup avec compression
pg_dump -h localhost -U postgres sweet_narcisse | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload vers MinIO
mc cp backup_*.gz minio/sweet-narcisse-backups/manual/
```

### 3.3 Restore Database

```bash
# ⚠️ ATTENTION: Cette opération remplace toutes les données

# 1. Arrêter l'application
docker compose stop app

# 2. Restore depuis backup
pg_restore -h localhost -U postgres -d sweet_narcisse --clean backup.dump

# Ou depuis SQL compressé
gunzip -c backup.sql.gz | psql -h localhost -U postgres sweet_narcisse

# 3. Relancer l'application
docker compose start app

# 4. Vérifier
curl -s https://www.sweet-narcisse.com/api/health
```

### 3.4 Requêtes Utiles

```sql
-- Nombre de réservations aujourd'hui
SELECT COUNT(*) FROM "Booking" 
WHERE date = CURRENT_DATE AND status != 'CANCELLED';

-- Chiffre d'affaires du jour
SELECT SUM("totalPrice") FROM "Booking"
WHERE date = CURRENT_DATE AND status = 'CONFIRMED' AND "isPaid" = true;

-- Réservations par bateau
SELECT b.name, COUNT(bk.id) as bookings
FROM "Boat" b
LEFT JOIN "Booking" bk ON b.id = bk."boatId" AND bk.date = CURRENT_DATE
GROUP BY b.name;

-- Taux d'occupation
SELECT 
  COUNT(*) as total_slots,
  COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as booked
FROM "Booking"
WHERE date = CURRENT_DATE;

-- Paiements du jour par méthode
SELECT provider, COUNT(*), SUM(amount)/100.0 as total_eur
FROM "Payment"
WHERE DATE("createdAt") = CURRENT_DATE
GROUP BY provider;
```

---

## 4. Cache Management

### 4.1 Vider le Cache Redis

```bash
# Connexion Redis
docker compose exec redis redis-cli

# Voir les clés
KEYS sweet_narcisse:*

# Supprimer une clé spécifique
DEL sweet_narcisse:availability:2025-06-28:fr:2:1:0

# Vider tout le cache
FLUSHALL

# Avec mc (Upstash/externe)
redis-cli -u $UPSTASH_REDIS_URL FLUSHALL
```

### 4.2 Invalider le Cache Programmatiquement

```typescript
// Via l'API (si endpoint exposé)
// POST /api/admin/cache/invalidate

// Ou via le code
import { cacheInvalidateDate, cacheInvalidateAll } from '@/lib/cache'
await cacheInvalidateDate('2025-06-28')
await cacheInvalidateAll()
```

### 4.3 Métriques Cache

```bash
# Stats Redis
docker compose exec redis redis-cli INFO stats

# Via l'API
curl -s https://www.sweet-narcisse.com/api/admin/cache/metrics | jq
```

---

## 5. Scaling Guide

### 5.1 Scaling Vertical (Plus de ressources)

```yaml
# docker-compose.yml - Modifier les limites
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 5.2 Scaling Horizontal (Plus d'instances)

```yaml
# docker-compose.yml - Ajouter des replicas
services:
  app:
    deploy:
      replicas: 3
```

```nginx
# nginx.conf - Load balancing
upstream app {
    least_conn;
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

### 5.3 Scaling Database

```bash
# Ajouter une réplique en lecture
# 1. Configurer PostgreSQL streaming replication
# 2. Mettre à jour la configuration Prisma

# prisma/schema.prisma
# datasource db {
#   provider = "postgresql"
#   url = env("DATABASE_URL")
#   directUrl = env("DIRECT_URL")  // Pour les migrations
# }
```

### 5.4 Seuils de Scaling

| Métrique | Seuil | Action |
|----------|-------|--------|
| CPU > 80% | 5 min | Ajouter instance |
| RAM > 85% | 5 min | Ajouter RAM |
| Latency P95 > 2s | 5 min | Investiguer |
| Error rate > 5% | 1 min | Alerte SEV1 |
| DB connections > 80% | - | Pool de connexions |

---

## 6. Maintenance Procedures

### 6.1 Mise à Jour des Dépendances

```bash
# Audit des vulnérabilités
npm audit

# Fix automatique
npm audit fix

# Mise à jour Prisma
npm update @prisma/client prisma
npx prisma generate
```

### 6.2 Nettoyage Espace Disque

```bash
# Nettoyage Docker
docker system prune -a --volumes

# Rotation des logs
journalctl --vacuum-size=500M

# Nettoyage npm cache
npm cache clean --force
```

### 6.3 Rotation des Secrets

```bash
# Utiliser le script automatique
./scripts/rotate-secrets.sh

# Ou manuellement
# 1. Générer nouveau secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Mettre à jour .env
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEW_SECRET/" .env

# 3. Redémarrer
docker compose restart app
```

### 6.4 Test de Restore Mensuel

```bash
# Script automatique
./scripts/test-restore.sh

# Ou manuellement
# 1. Télécharger le dernier backup
mc cp minio/sweet-narcisse-backups/latest.dump /tmp/

# 2. Créer une DB temporaire
docker compose exec db psql -U postgres -c "CREATE DATABASE test_restore"

# 3. Restaurer
pg_restore -h localhost -U postgres -d test_restore /tmp/latest.dump

# 4. Vérifier les tables
docker compose exec db psql -U postgres -d test_restore -c "\\dt"

# 5. Nettoyer
docker compose exec db psql -U postgres -c "DROP DATABASE test_restore"
```

---

## Annexes

### A. Variables d'Environnement Critiques

| Variable | Description | Impact si manquant |
|----------|-------------|-------------------|
| DATABASE_URL | URL PostgreSQL | App ne démarre pas |
| NEXTAUTH_SECRET | Secret NextAuth | Auth impossible |
| STRIPE_SECRET_KEY | Clé Stripe | Paiements impossibles |
| MINIO_ACCESS_KEY | Clé MinIO | Documents inaccessibles |

### B. Ports Réseau

| Service | Port interne | Port externe |
|---------|-------------|--------------|
| App (Next.js) | 3000 | 443 (via nginx) |
| PostgreSQL | 5432 | Non exposé |
| Redis | 6379 | Non exposé |
| MinIO | 9000/9001 | Non exposé |
| Prometheus | 9090 | Non exposé |
| Grafana | 3001 | 3001 |

### C. Chemins Importants

```
/opt/sweetnarcisse/           # Racine application
├── .env                      # Variables d'environnement
├── docker-compose.yml        # Configuration Docker
├── nginx/                    # Configuration nginx
├── monitoring/               # Prometheus/Grafana
├── scripts/                  # Scripts opérationnels
└── backups/                  # Backups locaux

/var/log/sweet-narcisse/      # Logs application
/var/lib/docker/volumes/      # Volumes Docker
```

---

**Fin du document**

> Pour toute question: devops@sweet-narcisse.com
