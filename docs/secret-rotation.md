# Secret Rotation Guide

## Overview

Sweet Narcisse implements automated monthly secret rotation for enhanced security. This document describes the rotation process and how to configure it.

## Secrets Rotated

| Secret | Rotation Frequency | Impact on Restart |
|--------|-------------------|-------------------|
| `NEXTAUTH_SECRET` | Monthly | Yes - Sessions invalidated |

## Scripts

### Linux/macOS
```bash
# Dry run (shows what would happen)
./scripts/rotate-secrets.sh --dry-run

# Force rotation (ignores 25-day check)
./scripts/rotate-secrets.sh --force

# Normal run (monthly check)
./scripts/rotate-secrets.sh
```

### Windows PowerShell
```powershell
# Dry run
.\scripts\rotate-secrets.ps1 -DryRun

# Force rotation
.\scripts\rotate-secrets.ps1 -Force

# Normal run
.\scripts\rotate-secrets.ps1
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENV_FILE` | `.env.production.local` | Path to environment file |
| `BACKUP_DIR` | `./backups/secrets` | Directory for backups |
| `LOG_FILE` | `./logs/secret-rotation.log` | Log file path |
| `NOTIFY_EMAIL` | (empty) | Email for notifications |

### Scheduling

#### Option 1: Cron (Linux)
```bash
# Copy example crontab
sudo cp scripts/cron/crontab.example /etc/cron.d/sweet-narcisse

# Or add to user crontab
crontab -e
# Add: 0 3 1 * * /opt/sweet-narcisse/scripts/rotate-secrets.sh
```

#### Option 2: Systemd Timer (Recommended for Linux)
```bash
# Copy service and timer files
sudo cp systemd/secret-rotation.service /etc/systemd/system/
sudo cp systemd/secret-rotation.timer /etc/systemd/system/

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable secret-rotation.timer
sudo systemctl start secret-rotation.timer

# Check timer status
sudo systemctl list-timers secret-rotation.timer
```

#### Option 3: Windows Task Scheduler
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-File C:\sweet-narcisse\scripts\rotate-secrets.ps1"
$trigger = New-ScheduledTaskTrigger -Monthly -At 3:00AM -DaysOfMonth 1
$settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable
Register-ScheduledTask -TaskName "SweetNarcisseSecretRotation" `
    -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM"
```

## What Happens During Rotation

1. **Backup**: Current `.env` file is backed up to `backups/secrets/`
2. **Generate**: New cryptographically secure secret is generated
3. **Update**: Environment file is updated with new secret
4. **Restart**: Application is automatically restarted
5. **Log**: All actions logged to `logs/secret-rotation.log`

## Session Impact

When `NEXTAUTH_SECRET` is rotated:
- All active user sessions are invalidated
- Users will need to log in again
- Schedule rotation during low-traffic hours (3 AM recommended)

## Backup Retention

- Last 6 backups are kept (6 months of history)
- Older backups are automatically deleted
- Backups are stored in `backups/secrets/env.YYYYMMDD_HHMMSS.bak`

## Manual Rotation

If you need to rotate secrets immediately:

```bash
# Linux
./scripts/rotate-secrets.sh --force

# Windows
.\scripts\rotate-secrets.ps1 -Force
```

## Troubleshooting

### Logs
```bash
# View rotation logs
tail -f logs/secret-rotation.log

# Check systemd journal (if using timer)
journalctl -u secret-rotation.service
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Permission denied" | Ensure script has execute permissions: `chmod +x scripts/rotate-secrets.sh` |
| "openssl not found" | Install OpenSSL: `apt install openssl` |
| "Could not restart" | Check Docker/systemd/PM2 is running |
| "Rotation skipped" | Use `--force` or wait 25 days since last rotation |

## Security Considerations

1. **Backup Encryption**: Consider encrypting backups with GPG for additional security
2. **File Permissions**: Ensure `.env` files have restricted permissions (600)
3. **Audit Trail**: Logs are kept for compliance and debugging
4. **Notification**: Configure `NOTIFY_EMAIL` for alerts

## Integration with CI/CD

For automated deployments, secrets should be managed through:
1. GitHub Secrets (for CI/CD pipelines)
2. Docker Secrets (for container deployments)
3. HashiCorp Vault (for enterprise environments)

The rotation script handles local environment files only. For cloud deployments, use your platform's secret management:
- Vercel: Environment Variables in Dashboard
- AWS: Secrets Manager with rotation Lambda
- GCP: Secret Manager with rotation
