# Database Backup Guide

## Overview

Sweet Narcisse implements automated database backups every 6 hours with:
- PostgreSQL dump with compression (90%+ size reduction)
- Optional GPG encryption for security
- Upload to MinIO (S3-compatible storage)
- Automatic cleanup (30 days retention)

## Quick Start

### Linux/macOS
```bash
# Dry run (shows what would happen)
./scripts/backup-db.sh --dry-run

# Create local backup only (no upload)
./scripts/backup-db.sh --no-upload

# Create unencrypted backup
./scripts/backup-db.sh --no-encrypt

# Full backup with upload
./scripts/backup-db.sh
```

### Windows PowerShell
```powershell
# Dry run
.\scripts\backup-db.ps1 -DryRun

# Local backup only
.\scripts\backup-db.ps1 -NoUpload

# Unencrypted backup
.\scripts\backup-db.ps1 -NoEncrypt

# Full backup
.\scripts\backup-db.ps1
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_ENDPOINT` | `http://localhost:9000` | MinIO/S3 endpoint |
| `STORAGE_ACCESS_KEY` | - | MinIO access key |
| `STORAGE_SECRET_KEY` | - | MinIO secret key |
| `STORAGE_BUCKET` | `sweet-backups` | Bucket for backups |
| `GPG_RECIPIENT` | - | GPG key ID for encryption |
| `BACKUP_DIR` | `./backups/db` | Local backup directory |
| `RETENTION_DAYS` | `30` | Days to keep backups |
| `LOG_FILE` | `./logs/backup-db.log` | Log file path |
| `NOTIFY_EMAIL` | - | Email for notifications |

## Scheduling

### Option 1: Cron (Linux)
```bash
# Copy crontab example
sudo cp scripts/cron/crontab.example /etc/cron.d/sweet-narcisse

# Or add to user crontab (runs at 0, 6, 12, 18 hours)
crontab -e
# Add: 0 0,6,12,18 * * * /opt/sweet-narcisse/scripts/backup-db.sh
```

### Option 2: Systemd Timer (Recommended)
```bash
# Copy service and timer files
sudo cp systemd/db-backup.service /etc/systemd/system/
sudo cp systemd/db-backup.timer /etc/systemd/system/

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable db-backup.timer
sudo systemctl start db-backup.timer

# Check timer status
sudo systemctl list-timers db-backup.timer

# Run manually
sudo systemctl start db-backup.service
```

### Option 3: Windows Task Scheduler
```powershell
# Create scheduled task (runs every 6 hours)
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-File C:\sweet-narcisse\scripts\backup-db.ps1"
$triggers = @(
    New-ScheduledTaskTrigger -Daily -At 00:00,
    New-ScheduledTaskTrigger -Daily -At 06:00,
    New-ScheduledTaskTrigger -Daily -At 12:00,
    New-ScheduledTaskTrigger -Daily -At 18:00
)
$settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable
Register-ScheduledTask -TaskName "SweetNarcisseDbBackup" `
    -Action $action -Trigger $triggers -Settings $settings -User "SYSTEM"
```

## Backup Process

1. **Dump Database**
   - Uses `pg_dump` with custom format
   - Compression level 9 (maximum)
   - Typical compression: 90%+ size reduction

2. **Encrypt (Optional)**
   - GPG encryption with specified recipient key
   - Skipped if `GPG_RECIPIENT` not set

3. **Upload to MinIO**
   - Uses AWS CLI with custom endpoint
   - Stored in `backups/` prefix
   - Skipped if credentials not configured

4. **Cleanup**
   - Removes local backups older than `RETENTION_DAYS`
   - Removes S3 objects older than `RETENTION_DAYS`

## Backup Files

| File | Description |
|------|-------------|
| `sweet_narcisse_YYYYMMDD_HHMMSS.dump` | Compressed PostgreSQL backup |
| `sweet_narcisse_YYYYMMDD_HHMMSS.dump.gpg` | Encrypted backup (if GPG enabled) |

## Restore

### From Local Backup
```bash
# Restore compressed backup
pg_restore --host=localhost --port=5432 --username=user \
    --dbname=sweet_narcisse --clean --if-exists \
    backups/db/sweet_narcisse_20240101_120000.dump

# Restore encrypted backup
gpg --decrypt backups/db/sweet_narcisse_20240101_120000.dump.gpg | \
    pg_restore --host=localhost --port=5432 --username=user \
    --dbname=sweet_narcisse --clean --if-exists
```

### From MinIO
```bash
# Download backup
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx \
    aws s3 cp s3://sweet-backups/backups/sweet_narcisse_20240101_120000.dump \
    --endpoint-url http://localhost:9000 ./restore.dump

# Restore
pg_restore --host=localhost --port=5432 --username=user \
    --dbname=sweet_narcisse --clean --if-exists restore.dump
```

## MinIO Setup

### Create Backup Bucket
```bash
# Using MinIO Client (mc)
mc alias set minio http://localhost:9000 ACCESS_KEY SECRET_KEY
mc mb minio/sweet-backups
mc policy set download minio/sweet-backups

# Or using AWS CLI
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx \
    aws s3 mb s3://sweet-backups --endpoint-url http://localhost:9000
```

### Lifecycle Policy (Auto-Expire)
```bash
# Create lifecycle policy for automatic expiration
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "ExpireOldBackups",
      "Status": "Enabled",
      "Filter": {"Prefix": "backups/"},
      "Expiration": {"Days": 30}
    }
  ]
}
EOF

mc ilm import minio/sweet-backups < lifecycle.json
```

## GPG Encryption Setup

### Generate Key
```bash
# Generate new GPG key
gpg --full-generate-key

# List keys
gpg --list-keys

# Export public key (for other servers)
gpg --export --armor your-key-id > backup-key.pub
```

### Import Key (On Backup Server)
```bash
gpg --import backup-key.pub
gpg --edit-key your-key-id trust quit
```

## Monitoring

### Check Backup Status
```bash
# View recent backups
ls -la backups/db/

# View backup logs
tail -f logs/backup-db.log

# Check systemd journal
journalctl -u db-backup.service -f
```

### Prometheus Metrics (Future)
```yaml
# Alert if no backup in 12 hours
- alert: BackupMissing
  expr: time() - file_modification_time{job="backup"} > 43200
  labels:
    severity: critical
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `pg_dump not found` | Install PostgreSQL client: `apt install postgresql-client` |
| `Connection refused` | Check DATABASE_URL and PostgreSQL is running |
| `Permission denied` | Ensure script has execute permissions |
| `S3 upload failed` | Check MinIO credentials and endpoint |
| `GPG key not found` | Import key: `gpg --import key.pub` |

### Logs Location
```bash
# Backup logs
cat logs/backup-db.log

# Systemd journal
journalctl -u db-backup.service --since "1 hour ago"
```

## Recovery Time Objectives

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time) | < 4 hours |
| **RPO** (Recovery Point) | < 6 hours |
| **Backup Frequency** | Every 6 hours |
| **Retention** | 30 days |

## Best Practices

1. **Test Restores Regularly**
   - Monthly restore test to verify backups
   - Document restore time

2. **Monitor Backup Size**
   - Track backup size trends
   - Alert on sudden changes

3. **Secure Encryption Keys**
   - Store GPG keys securely
   - Use different keys for production/staging

4. **Off-site Storage**
   - Consider replication to another region
   - Use MinIO replication features
