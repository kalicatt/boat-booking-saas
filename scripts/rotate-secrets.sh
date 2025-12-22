#!/bin/bash
#
# Secret Rotation Script for Sweet Narcisse
# Run monthly via cron: 0 3 1 * * /path/to/rotate-secrets.sh
#
# Rotates:
#   - NEXTAUTH_SECRET (critical)
#   - Optional: other internal secrets
#
# Usage:
#   ./rotate-secrets.sh [--dry-run] [--force]
#
# Environment:
#   ENV_FILE: Path to .env file (default: .env.production.local)
#   BACKUP_DIR: Directory for backups (default: ./backups/secrets)
#   NOTIFY_EMAIL: Email for notifications (optional)
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.production.local}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/secrets}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/secret-rotation.log}"

DRY_RUN=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ============================================================================
# Logging
# ============================================================================

log() {
    local level="$1"
    shift
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local message="[$timestamp] [$level] $*"
    echo "$message"
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "$message" >> "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# ============================================================================
# Utilities
# ============================================================================

generate_secret() {
    # Generate 64 character base64-encoded random string
    openssl rand -base64 48 | tr -d '\n'
}

backup_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warn "No existing env file to backup: $ENV_FILE"
        return 0
    fi
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="env.$(date '+%Y%m%d_%H%M%S').bak"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would backup to: $backup_path"
    else
        cp "$ENV_FILE" "$backup_path"
        chmod 600 "$backup_path"
        log_info "Created backup: $backup_path"
    fi
    
    # Keep only last 6 backups (6 months)
    if [[ "$DRY_RUN" == "false" ]]; then
        ls -t "$BACKUP_DIR"/env.*.bak 2>/dev/null | tail -n +7 | xargs -r rm -f
    fi
}

update_env_var() {
    local var_name="$1"
    local new_value="$2"
    local file="$3"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would update $var_name in $file"
        return 0
    fi
    
    # Create file if doesn't exist
    if [[ ! -f "$file" ]]; then
        touch "$file"
        chmod 600 "$file"
    fi
    
    # Check if variable exists
    if grep -q "^${var_name}=" "$file" 2>/dev/null; then
        # Update existing variable (macOS/Linux compatible)
        if [[ "$(uname)" == "Darwin" ]]; then
            sed -i '' "s|^${var_name}=.*|${var_name}=${new_value}|" "$file"
        else
            sed -i "s|^${var_name}=.*|${var_name}=${new_value}|" "$file"
        fi
        log_info "Updated existing $var_name"
    else
        # Append new variable
        echo "${var_name}=${new_value}" >> "$file"
        log_info "Added new $var_name"
    fi
}

notify() {
    local subject="$1"
    local body="$2"
    
    if [[ -z "$NOTIFY_EMAIL" ]]; then
        return 0
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would send email to $NOTIFY_EMAIL"
        return 0
    fi
    
    if command -v mail &> /dev/null; then
        echo "$body" | mail -s "$subject" "$NOTIFY_EMAIL"
        log_info "Notification sent to $NOTIFY_EMAIL"
    else
        log_warn "mail command not found, skipping notification"
    fi
}

restart_app() {
    log_info "Initiating application restart..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would restart application"
        return 0
    fi
    
    # Try different restart methods in order of preference
    
    # Method 1: Docker Compose (production)
    if [[ -f "$PROJECT_ROOT/docker-compose.yml" ]] && command -v docker &> /dev/null; then
        cd "$PROJECT_ROOT"
        docker compose restart app 2>/dev/null && {
            log_info "Restarted via docker compose"
            return 0
        }
    fi
    
    # Method 2: Systemd service
    if command -v systemctl &> /dev/null; then
        systemctl restart sweet-narcisse 2>/dev/null && {
            log_info "Restarted via systemd"
            return 0
        }
    fi
    
    # Method 3: PM2
    if command -v pm2 &> /dev/null; then
        pm2 restart sweet-narcisse 2>/dev/null && {
            log_info "Restarted via PM2"
            return 0
        }
    fi
    
    log_warn "Could not auto-restart application. Please restart manually."
    return 1
}

# ============================================================================
# Main rotation logic
# ============================================================================

rotate_nextauth_secret() {
    log_info "=== Rotating NEXTAUTH_SECRET ==="
    
    local new_secret=$(generate_secret)
    
    backup_env
    update_env_var "NEXTAUTH_SECRET" "$new_secret" "$ENV_FILE"
    
    log_info "NEXTAUTH_SECRET rotated successfully"
    return 0
}

check_rotation_needed() {
    # Force rotation always runs
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    # Check if it's been at least 25 days since last rotation
    local marker_file="$BACKUP_DIR/.last_rotation"
    
    if [[ -f "$marker_file" ]]; then
        local last_rotation=$(cat "$marker_file")
        local current_time=$(date +%s)
        local diff=$(( (current_time - last_rotation) / 86400 ))
        
        if [[ $diff -lt 25 ]]; then
            log_info "Last rotation was $diff days ago. Skipping (run with --force to override)"
            return 1
        fi
    fi
    
    return 0
}

update_rotation_marker() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return 0
    fi
    
    mkdir -p "$BACKUP_DIR"
    date +%s > "$BACKUP_DIR/.last_rotation"
}

main() {
    log_info "========================================"
    log_info "Secret Rotation Started"
    log_info "========================================"
    log_info "Environment file: $ENV_FILE"
    log_info "Dry run: $DRY_RUN"
    log_info "Force: $FORCE"
    
    # Pre-flight checks
    if ! command -v openssl &> /dev/null; then
        log_error "openssl is required but not installed"
        exit 1
    fi
    
    # Check if rotation is needed
    if ! check_rotation_needed; then
        exit 0
    fi
    
    local rotation_status="SUCCESS"
    local errors=""
    
    # Rotate NEXTAUTH_SECRET
    if ! rotate_nextauth_secret; then
        rotation_status="FAILED"
        errors="${errors}NEXTAUTH_SECRET rotation failed\n"
    fi
    
    # Update marker
    if [[ "$rotation_status" == "SUCCESS" ]]; then
        update_rotation_marker
    fi
    
    # Restart application
    if [[ "$DRY_RUN" == "false" && "$rotation_status" == "SUCCESS" ]]; then
        if ! restart_app; then
            errors="${errors}Application restart failed - manual restart required\n"
        fi
    fi
    
    # Summary
    log_info "========================================"
    log_info "Secret Rotation Complete: $rotation_status"
    log_info "========================================"
    
    # Send notification
    local notification_body="Secret rotation completed on $(hostname) at $(date).

Status: $rotation_status
Environment: $ENV_FILE
Dry Run: $DRY_RUN

Rotated secrets:
- NEXTAUTH_SECRET

${errors:+Errors:\n$errors}"

    notify "[Sweet Narcisse] Secret Rotation: $rotation_status" "$notification_body"
    
    if [[ "$rotation_status" == "FAILED" ]]; then
        exit 1
    fi
}

main "$@"
