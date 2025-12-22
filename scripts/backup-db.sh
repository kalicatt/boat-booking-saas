#!/bin/bash
#
# Database Backup Script for Sweet Narcisse
# Run every 6 hours via cron: 0 */6 * * * /path/to/backup-db.sh
#
# Features:
#   - PostgreSQL dump with compression
#   - GPG encryption
#   - Upload to MinIO (S3-compatible)
#   - Automatic retention (30 days)
#
# Usage:
#   ./backup-db.sh [--dry-run] [--no-upload] [--no-encrypt]
#
# Environment:
#   DATABASE_URL: PostgreSQL connection string
#   STORAGE_ENDPOINT: MinIO/S3 endpoint
#   STORAGE_ACCESS_KEY: MinIO access key
#   STORAGE_SECRET_KEY: MinIO secret key
#   STORAGE_BUCKET: Bucket name (default: sweet-backups)
#   GPG_RECIPIENT: GPG key ID for encryption (optional)
#   NOTIFY_EMAIL: Email for notifications (optional)
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Database
DATABASE_URL="${DATABASE_URL:-}"

# Storage
STORAGE_ENDPOINT="${STORAGE_ENDPOINT:-http://localhost:9000}"
STORAGE_ACCESS_KEY="${STORAGE_ACCESS_KEY:-}"
STORAGE_SECRET_KEY="${STORAGE_SECRET_KEY:-}"
STORAGE_BUCKET="${STORAGE_BUCKET:-sweet-backups}"

# Encryption
GPG_RECIPIENT="${GPG_RECIPIENT:-}"

# Local paths
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/db}"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/backup-db.log}"

# Retention
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Notifications
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

# Flags
DRY_RUN=false
NO_UPLOAD=false
NO_ENCRYPT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-upload)
            NO_UPLOAD=true
            shift
            ;;
        --no-encrypt)
            NO_ENCRYPT=true
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

cleanup() {
    local exit_code=$?
    if [[ -n "${TEMP_FILE:-}" && -f "$TEMP_FILE" ]]; then
        rm -f "$TEMP_FILE"
    fi
    if [[ -n "${ENCRYPTED_FILE:-}" && -f "$ENCRYPTED_FILE" ]]; then
        rm -f "$ENCRYPTED_FILE"
    fi
    exit $exit_code
}

trap cleanup EXIT INT TERM

parse_database_url() {
    # Parse DATABASE_URL into components
    # Format: postgresql://user:password@host:port/database
    local url="$1"
    
    # Remove protocol
    local remainder="${url#postgresql://}"
    remainder="${remainder#postgres://}"
    
    # Extract user:password
    local auth="${remainder%%@*}"
    DB_USER="${auth%%:*}"
    DB_PASSWORD="${auth#*:}"
    
    # Extract host:port/database
    local hostportdb="${remainder#*@}"
    local hostport="${hostportdb%%/*}"
    DB_HOST="${hostport%%:*}"
    DB_PORT="${hostport#*:}"
    
    # Handle case where port is not specified
    if [[ "$DB_PORT" == "$DB_HOST" ]]; then
        DB_PORT="5432"
    fi
    
    # Extract database name
    DB_NAME="${hostportdb#*/}"
    DB_NAME="${DB_NAME%%\?*}"  # Remove query parameters
}

create_backup() {
    local backup_name="$1"
    local output_file="$2"
    
    log_info "Creating PostgreSQL backup: $backup_name"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would create backup to: $output_file"
        # Create empty file for dry run
        touch "$output_file"
        return 0
    fi
    
    # Parse database URL
    parse_database_url "$DATABASE_URL"
    
    # Create backup using pg_dump
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="$output_file" \
        2>&1 | while read -r line; do log_info "pg_dump: $line"; done
    
    if [[ ! -f "$output_file" ]]; then
        log_error "Backup file was not created"
        return 1
    fi
    
    local size=$(stat -c%s "$output_file" 2>/dev/null || stat -f%z "$output_file" 2>/dev/null)
    log_info "Backup created: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "${size} bytes")"
}

encrypt_file() {
    local input_file="$1"
    local output_file="$2"
    
    if [[ "$NO_ENCRYPT" == "true" || -z "$GPG_RECIPIENT" ]]; then
        log_info "Encryption skipped (no GPG recipient configured)"
        cp "$input_file" "$output_file"
        return 0
    fi
    
    log_info "Encrypting backup with GPG..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would encrypt to: $output_file"
        cp "$input_file" "$output_file"
        return 0
    fi
    
    gpg --encrypt \
        --recipient "$GPG_RECIPIENT" \
        --output "$output_file" \
        --trust-model always \
        "$input_file"
    
    log_info "Backup encrypted successfully"
}

upload_to_minio() {
    local file_path="$1"
    local object_key="$2"
    
    if [[ "$NO_UPLOAD" == "true" ]]; then
        log_info "Upload skipped (--no-upload flag)"
        return 0
    fi
    
    if [[ -z "$STORAGE_ACCESS_KEY" || -z "$STORAGE_SECRET_KEY" ]]; then
        log_warn "MinIO credentials not configured, skipping upload"
        return 0
    fi
    
    log_info "Uploading to MinIO: $object_key"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would upload to: s3://$STORAGE_BUCKET/$object_key"
        return 0
    fi
    
    # Use AWS CLI with MinIO endpoint
    AWS_ACCESS_KEY_ID="$STORAGE_ACCESS_KEY" \
    AWS_SECRET_ACCESS_KEY="$STORAGE_SECRET_KEY" \
    aws s3 cp "$file_path" "s3://$STORAGE_BUCKET/$object_key" \
        --endpoint-url "$STORAGE_ENDPOINT" \
        2>&1 | while read -r line; do log_info "s3: $line"; done
    
    log_info "Upload complete"
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Clean local backups
    if [[ -d "$BACKUP_DIR" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            find "$BACKUP_DIR" -type f -name "*.dump*" -mtime +$RETENTION_DAYS -print | \
                while read -r f; do log_info "[DRY-RUN] Would delete: $f"; done
        else
            find "$BACKUP_DIR" -type f -name "*.dump*" -mtime +$RETENTION_DAYS -delete -print | \
                while read -r f; do log_info "Deleted local: $f"; done
        fi
    fi
    
    # Clean MinIO backups
    if [[ "$NO_UPLOAD" == "false" && -n "$STORAGE_ACCESS_KEY" && -n "$STORAGE_SECRET_KEY" ]]; then
        local cutoff_date=$(date -d "-${RETENTION_DAYS} days" '+%Y-%m-%d' 2>/dev/null || \
                           date -v-${RETENTION_DAYS}d '+%Y-%m-%d' 2>/dev/null)
        
        if [[ -n "$cutoff_date" ]]; then
            log_info "Cleaning S3 objects older than $cutoff_date"
            
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "[DRY-RUN] Would clean S3 backups older than $cutoff_date"
            else
                # List and delete old objects
                AWS_ACCESS_KEY_ID="$STORAGE_ACCESS_KEY" \
                AWS_SECRET_ACCESS_KEY="$STORAGE_SECRET_KEY" \
                aws s3 ls "s3://$STORAGE_BUCKET/backups/" \
                    --endpoint-url "$STORAGE_ENDPOINT" 2>/dev/null | \
                while read -r line; do
                    local obj_date=$(echo "$line" | awk '{print $1}')
                    local obj_name=$(echo "$line" | awk '{print $4}')
                    if [[ "$obj_date" < "$cutoff_date" && -n "$obj_name" ]]; then
                        log_info "Deleting old S3 object: $obj_name"
                        AWS_ACCESS_KEY_ID="$STORAGE_ACCESS_KEY" \
                        AWS_SECRET_ACCESS_KEY="$STORAGE_SECRET_KEY" \
                        aws s3 rm "s3://$STORAGE_BUCKET/backups/$obj_name" \
                            --endpoint-url "$STORAGE_ENDPOINT" 2>/dev/null
                    fi
                done
            fi
        fi
    fi
    
    log_info "Cleanup complete"
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

# ============================================================================
# Main
# ============================================================================

main() {
    log_info "========================================"
    log_info "Database Backup Started"
    log_info "========================================"
    log_info "Dry run: $DRY_RUN"
    log_info "Upload: $([[ "$NO_UPLOAD" == "true" ]] && echo "disabled" || echo "enabled")"
    log_info "Encrypt: $([[ "$NO_ENCRYPT" == "true" ]] && echo "disabled" || echo "enabled")"
    
    # Pre-flight checks
    if [[ -z "$DATABASE_URL" ]]; then
        log_error "DATABASE_URL is required"
        exit 1
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is required but not installed"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup name
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="sweet_narcisse_${timestamp}"
    
    # Create temp file for backup
    TEMP_FILE="$BACKUP_DIR/${backup_name}.dump"
    
    local status="SUCCESS"
    local errors=""
    local final_file=""
    
    # Step 1: Create backup
    if ! create_backup "$backup_name" "$TEMP_FILE"; then
        status="FAILED"
        errors="${errors}Backup creation failed\n"
    fi
    
    # Step 2: Encrypt (if enabled)
    if [[ "$status" == "SUCCESS" && -f "$TEMP_FILE" ]]; then
        if [[ "$NO_ENCRYPT" == "true" || -z "$GPG_RECIPIENT" ]]; then
            final_file="$TEMP_FILE"
        else
            ENCRYPTED_FILE="${TEMP_FILE}.gpg"
            if ! encrypt_file "$TEMP_FILE" "$ENCRYPTED_FILE"; then
                status="FAILED"
                errors="${errors}Encryption failed\n"
            else
                final_file="$ENCRYPTED_FILE"
                rm -f "$TEMP_FILE"
                TEMP_FILE=""
            fi
        fi
    fi
    
    # Step 3: Upload to MinIO
    if [[ "$status" == "SUCCESS" && -n "$final_file" && -f "$final_file" ]]; then
        local object_key="backups/$(basename "$final_file")"
        if ! upload_to_minio "$final_file" "$object_key"; then
            status="PARTIAL"
            errors="${errors}Upload failed (local backup preserved)\n"
        fi
    fi
    
    # Step 4: Cleanup old backups
    cleanup_old_backups
    
    # Summary
    log_info "========================================"
    log_info "Database Backup Complete: $status"
    if [[ -n "$final_file" && -f "$final_file" ]]; then
        local size=$(stat -c%s "$final_file" 2>/dev/null || stat -f%z "$final_file" 2>/dev/null || echo "unknown")
        log_info "Backup file: $final_file"
        log_info "Backup size: $(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "${size} bytes")"
    fi
    log_info "========================================"
    
    # Send notification
    local notification_body="Database backup completed on $(hostname) at $(date).

Status: $status
Database: $(echo "$DATABASE_URL" | sed 's/:.*@/@/g')
Backup: $(basename "${final_file:-N/A}")
Size: $(stat -c%s "${final_file:-/dev/null}" 2>/dev/null || echo "N/A") bytes

${errors:+Errors:\n$errors}"

    notify "[Sweet Narcisse] DB Backup: $status" "$notification_body"
    
    if [[ "$status" == "FAILED" ]]; then
        exit 1
    fi
}

main "$@"
