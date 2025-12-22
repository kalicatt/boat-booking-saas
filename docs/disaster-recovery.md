# Disaster Recovery Plan

## Overview

This document outlines the disaster recovery procedures for Sweet Narcisse application and infrastructure.

| Metric | Target | Current |
|--------|--------|---------|
| **RTO** (Recovery Time Objective) | < 4 hours | ✅ Achievable |
| **RPO** (Recovery Point Objective) | < 6 hours | ✅ 6h backup cycle |

## Contact Information

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call Engineer | (defined in ops runbook) | 15 min |
| Database Admin | (defined in ops runbook) | 30 min |
| Infrastructure Lead | (defined in ops runbook) | 1 hour |

---

## Incident Classification

### Severity Levels

| Level | Description | RTO | Examples |
|-------|-------------|-----|----------|
| **SEV1** | Complete outage | 1h | Database corruption, server down |
| **SEV2** | Major degradation | 2h | Payment processing failure |
| **SEV3** | Partial degradation | 4h | Minor features unavailable |
| **SEV4** | Non-critical | 24h | Cosmetic issues |

---

## Recovery Procedures

### 1. Database Failure

#### Symptoms
- Application errors: "Connection refused"
- Error logs: "ECONNREFUSED", "FATAL: database does not exist"
- Health check failures

#### Recovery Steps

```bash
# Step 1: Check PostgreSQL status
systemctl status postgresql

# Step 2: Check if database exists
sudo -u postgres psql -l | grep sweet_narcisse

# Step 3: If database is corrupted, restore from backup
cd /opt/sweet-narcisse

# Find latest backup
ls -la backups/db/

# Restore (choose most recent .dump file)
export DATABASE_URL="postgresql://user:password@localhost:5432/sweet_narcisse"
./scripts/backup-db.sh --dry-run  # Verify config

# Drop and recreate database
sudo -u postgres dropdb sweet_narcisse
sudo -u postgres createdb -O sweet_narcisse sweet_narcisse

# Restore from backup
sudo -u postgres pg_restore \
    --dbname=sweet_narcisse \
    --no-owner \
    --clean \
    backups/db/sweet_narcisse_YYYYMMDD_HHMMSS.dump

# Verify restoration
./scripts/test-restore.sh --backup-file backups/db/latest.dump

# Step 4: Restart application
systemctl restart sweet-narcisse
```

#### Estimated Time: 30-60 minutes

---

### 2. Application Server Failure

#### Symptoms
- HTTP 502/503 errors
- Load balancer health checks failing
- No response from server

#### Recovery Steps

```bash
# Step 1: Check application status
systemctl status sweet-narcisse
journalctl -u sweet-narcisse --since "1 hour ago"

# Step 2: Check resources
free -h
df -h
top -bn1 | head -20

# Step 3: Restart application
systemctl restart sweet-narcisse

# Step 4: If restart fails, check Docker
docker compose ps
docker compose logs app --tail 100

# Step 5: Rebuild if necessary
cd /opt/sweet-narcisse
docker compose down
docker compose build --no-cache app
docker compose up -d
```

#### If Server is Unrecoverable

```bash
# On new server:

# 1. Clone repository
git clone https://github.com/kalicatt/SweetNarcisse.git /opt/sweet-narcisse
cd /opt/sweet-narcisse

# 2. Copy environment files (from backup)
scp backup-server:/opt/sweet-narcisse/.env.production.local .

# 3. Install dependencies
npm ci --production

# 4. Restore database (from MinIO backup)
aws s3 cp s3://sweet-backups/backups/latest.dump ./restore.dump \
    --endpoint-url http://minio:9000

pg_restore --dbname=sweet_narcisse restore.dump

# 5. Start application
docker compose up -d
```

#### Estimated Time: 15-45 minutes

---

### 3. MinIO/Storage Failure

#### Symptoms
- Image upload failures
- Document downloads failing
- Error: "S3 connection refused"

#### Recovery Steps

```bash
# Step 1: Check MinIO status
docker compose ps minio
docker compose logs minio --tail 50

# Step 2: Restart MinIO
docker compose restart minio

# Step 3: Verify buckets exist
mc alias set minio http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
mc ls minio/

# Step 4: If data is corrupted, restore from backup
# (MinIO data should be on persistent volume)
docker volume inspect sweet-narcisse_minio-data
```

#### Estimated Time: 15-30 minutes

---

### 4. Redis Cache Failure

#### Symptoms
- Slow response times
- Rate limiting not working
- Session issues

#### Recovery Steps

```bash
# Step 1: Check Redis status
docker compose ps redis
docker compose logs redis --tail 50

# Step 2: Restart Redis
docker compose restart redis

# Step 3: Verify connection
redis-cli ping

# Step 4: Clear cache if corrupted
redis-cli FLUSHALL

# Step 5: Restart application to rebuild cache
systemctl restart sweet-narcisse
```

#### Note: Redis is non-critical - application has fallback to memory cache

#### Estimated Time: 5-15 minutes

---

### 5. Complete Infrastructure Failure

#### Symptoms
- All services down
- Server unreachable
- Data center outage

#### Recovery Steps

```bash
# Step 1: Provision new server (manual or Terraform)
# Recommended: Ubuntu 22.04 LTS, 4GB RAM, 50GB SSD

# Step 2: Install dependencies
./scripts/harden-vps.sh
apt update && apt install -y docker.io docker-compose-plugin postgresql-client

# Step 3: Clone repository
git clone https://github.com/kalicatt/SweetNarcisse.git /opt/sweet-narcisse
cd /opt/sweet-narcisse

# Step 4: Restore secrets (from secure backup)
# Option A: From encrypted backup
gpg --decrypt /backup/secrets/env.backup.gpg > .env.production.local

# Option B: Recreate manually
cp .env.example .env.production.local
# Edit with production values from password manager

# Step 5: Restore database from MinIO (or off-site backup)
aws s3 cp s3://sweet-backups/backups/latest.dump ./restore.dump \
    --endpoint-url https://backup-minio.example.com

# Step 6: Start database
docker compose up -d db

# Wait for DB to be ready
sleep 30

# Step 7: Create and restore database
docker compose exec db createdb -U postgres sweet_narcisse
docker compose exec -T db pg_restore -U postgres -d sweet_narcisse < restore.dump

# Step 8: Start all services
docker compose up -d

# Step 9: Verify
curl -f http://localhost:3000/api/health

# Step 10: Update DNS (if IP changed)
# Update A record for sweet-narcisse.fr
```

#### Estimated Time: 2-4 hours

---

## Backup Locations

| Data | Primary | Secondary | Retention |
|------|---------|-----------|-----------|
| Database | MinIO (local) | (configure off-site) | 30 days |
| Secrets | backups/secrets/ | Password manager | 6 months |
| Documents | MinIO bucket | (configure off-site) | Per policy |
| Logs | /var/log/sweet-narcisse | (configure log aggregator) | 90 days |

---

## Pre-Disaster Checklist

### Daily
- [ ] Verify backup cron jobs running (`systemctl list-timers`)
- [ ] Check disk space (`df -h`)
- [ ] Review error logs

### Weekly
- [ ] Verify MinIO backup uploads
- [ ] Test application health endpoints
- [ ] Review security alerts

### Monthly
- [ ] Run restore test (`./scripts/test-restore.sh`)
- [ ] Verify secret rotation
- [ ] Update this DR plan if needed
- [ ] Review and rotate access credentials

---

## Communication Plan

### During Incident

1. **Acknowledge** - Confirm incident in #ops channel
2. **Assess** - Determine severity level
3. **Communicate** - Post status update every 30 minutes
4. **Resolve** - Follow recovery procedures
5. **Post-mortem** - Document within 48 hours

### Status Page Updates

```markdown
# Template for status updates

**[TIME] - [STATUS]**

We are currently experiencing [ISSUE DESCRIPTION].

Impact: [USER IMPACT]

Next update: [TIME]

Current status: Investigating / Identified / Monitoring / Resolved
```

---

## Post-Incident

### Checklist

- [ ] Verify all services operational
- [ ] Run health checks on all endpoints
- [ ] Check for data integrity issues
- [ ] Review logs for any missed errors
- [ ] Update monitoring alerts if needed
- [ ] Schedule post-mortem meeting

### Post-Mortem Template

```markdown
## Incident Post-Mortem

**Date:** YYYY-MM-DD
**Duration:** X hours
**Severity:** SEV1/2/3/4
**Author:** [Name]

### Summary
Brief description of what happened.

### Timeline
- HH:MM - First alert
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

### Root Cause
Detailed explanation of what caused the incident.

### Impact
- Users affected: X
- Revenue impact: €X
- Data loss: None/Partial/Complete

### Action Items
- [ ] Short-term fix: [Description]
- [ ] Long-term fix: [Description]
- [ ] Process improvement: [Description]

### Lessons Learned
What we learned from this incident.
```

---

## Testing Schedule

| Test | Frequency | Last Run | Next Run |
|------|-----------|----------|----------|
| Backup restore | Monthly | [DATE] | [DATE] |
| Failover drill | Quarterly | [DATE] | [DATE] |
| Full DR test | Annually | [DATE] | [DATE] |

---

## Appendix

### Useful Commands

```bash
# Check all services
docker compose ps

# View recent logs
journalctl -u sweet-narcisse --since "1 hour ago"

# Database connection test
PGPASSWORD=xxx psql -h localhost -U user -d sweet_narcisse -c "SELECT 1"

# Redis connection test
redis-cli ping

# MinIO connection test
mc ls minio/sweet-backups

# Application health
curl -f http://localhost:3000/api/health

# SSL certificate expiry
echo | openssl s_client -servername sweet-narcisse.fr -connect sweet-narcisse.fr:443 2>/dev/null | openssl x509 -noout -dates
```

### Emergency Contacts

| Service | Support URL | Account |
|---------|-------------|---------|
| Domain (OVH/Gandi) | support.ovh.com | [Account ID] |
| Hosting | [Provider] | [Account ID] |
| Stripe | dashboard.stripe.com | [Account ID] |
| PayPal | paypal.com/business | [Account ID] |

---

*Last updated: December 2025*
*Review schedule: Quarterly*
