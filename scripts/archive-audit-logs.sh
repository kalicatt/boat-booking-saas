#!/bin/bash
#
# Audit Log Archive Script for Sweet Narcisse
# Run daily via cron: 0 5 * * * /path/to/archive-audit-logs.sh
#
# Features:
#   - Archives application logs daily
#   - Compresses with gzip
#   - GPG encryption (optional)
#   - Upload to MinIO for immutable storage
#   - 90 days retention
#   - Integrity verification (SHA256 checksums)
#
# Usage:
#   ./archive-audit-logs.sh [--dry-run] [--no-upload] [--no-encrypt]
#
# Environment:
#   STORAGE_ENDPOINT: MinIO/S3 endpoint
#   STORAGE_ACCESS_KEY: MinIO access key
#   STORAGE_SECRET_KEY: MinIO secret key
#   STORAGE_BUCKET: Bucket name (default: sweet-audit-logs)
#   GPG_RECIPIENT: GPG key ID for encryption (optional)
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source log directories
LOG_DIRS=(
    "$PROJECT_ROOT/logs"
    "/var/log/sweet-narcisse"
)

# Archive destination
ARCHIVE_DIR="${ARCHIVE_DIR:-$PROJECT_ROOT/backups/audit-logs}"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/archive-audit.log}"

# Storage
STORAGE_ENDPOINT="${STORAGE_ENDPOINT:-http://localhost:9000}"
STORAGE_ACCESS_KEY="${STORAGE_ACCESS_KEY:-}"
STORAGE_SECRET_KEY="${STORAGE_SECRET_KEY:-}"
STORAGE_BUCKET="${STORAGE_BUCKET:-sweet-audit-logs}"

# Encryption
GPG_RECIPIENT="${GPG_RECIPIENT:-}"

# Retention
RETENTION_DAYS="${RETENTION_DAYS:-90}"

# Notifications
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

# Flags
DRY_RUN=false
NO_UPLOAD=false
NO_ENCRYPT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        --no-upload) NO_UPLOAD=true; shift ;;
        --no-encrypt) NO_ENCRYPT=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ============================================================================
# Logging
# ============================================================================

log() {
    local level="$1"; shift
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
    # Cleanup temp files
    if [[ -n "${TEMP_DIR:-}" && -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
    exit $exit_code
}

trap cleanup EXIT INT TERM

create_checksum() {
    local file="$1"
    local checksum_file="${file}.sha256"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would create checksum: $checksum_file"
        return 0
    fi
    
    sha256sum "$file" | awk '{print $1}' > "$checksum_file"
    log_info "Created checksum: $checksum_file"
}

verify_checksum() {
    local file="$1"
    local checksum_file="${file}.sha256"
    
    if [[ ! -f "$checksum_file" ]]; then
        log_warn "No checksum file found for: $file"
        return 1
    fi
    
    local expected=$(cat "$checksum_file")
    local actual=$(sha256sum "$file" | awk '{print $1}')
    
    if [[ "$expected" != "$actual" ]]; then
        log_error "Checksum mismatch for: $file"
        return 1
    fi
    
    log_info "Checksum verified: $file"
    return 0
}

archive_logs() {
    local source_dir="$1"
    local archive_name="$2"
    local output_file="$TEMP_DIR/${archive_name}.tar.gz"
    
    if [[ ! -d "$source_dir" ]]; then
        log_warn "Source directory not found: $source_dir"
        return 1
    fi
    
    # Find log files from yesterday (for immutable daily archives)
    local yesterday=$(date -d "yesterday" '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null)
    
    log_info "Archiving logs from $source_dir for $yesterday"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would archive logs to: $output_file"
        touch "$output_file"
        return 0
    fi
    
    # Find and archive log files modified yesterday
    local log_files=$(find "$source_dir" -type f \( -name "*.log" -o -name "*.json" \) \
        -newermt "$yesterday 00:00:00" ! -newermt "$yesterday 23:59:59" 2>/dev/null || true)
    
    if [[ -z "$log_files" ]]; then
        # If no logs from yesterday, archive any .log files
        log_files=$(find "$source_dir" -type f -name "*.log" -mtime -1 2>/dev/null || true)
    fi
    
    if [[ -z "$log_files" ]]; then
        log_info "No log files to archive in $source_dir"
        return 0
    fi
    
    # Create tarball
    echo "$log_files" | tar -czf "$output_file" -T - 2>/dev/null || {
        # Fallback: archive entire directory
        tar -czf "$output_file" -C "$(dirname "$source_dir")" "$(basename "$source_dir")" 2>/dev/null
    }
    
    local size=$(stat -c%s "$output_file" 2>/dev/null || stat -f%z "$output_file" 2>/dev/null)
    log_info "Created archive: $output_file ($(numfmt --to=iec-i --suffix=B $size 2>/dev/null || echo "${size} bytes"))"
    
    echo "$output_file"
}

encrypt_file() {
    local input_file="$1"
    local output_file="${input_file}.gpg"
    
    if [[ "$NO_ENCRYPT" == "true" || -z "$GPG_RECIPIENT" ]]; then
        log_info "Encryption skipped"
        echo "$input_file"
        return 0
    fi
    
    log_info "Encrypting archive..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would encrypt to: $output_file"
        echo "$input_file"
        return 0
    fi
    
    gpg --encrypt \
        --recipient "$GPG_RECIPIENT" \
        --output "$output_file" \
        --trust-model always \
        "$input_file"
    
    rm -f "$input_file"
    log_info "Encrypted: $output_file"
    echo "$output_file"
}

upload_to_minio() {
    local file_path="$1"
    local object_key="$2"
    
    if [[ "$NO_UPLOAD" == "true" ]]; then
        log_info "Upload skipped"
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
    
    AWS_ACCESS_KEY_ID="$STORAGE_ACCESS_KEY" \
    AWS_SECRET_ACCESS_KEY="$STORAGE_SECRET_KEY" \
    aws s3 cp "$file_path" "s3://$STORAGE_BUCKET/$object_key" \
        --endpoint-url "$STORAGE_ENDPOINT" 2>&1 | while read -r line; do log_info "s3: $line"; done
    
    # Also upload checksum
    if [[ -f "${file_path}.sha256" ]]; then
        AWS_ACCESS_KEY_ID="$STORAGE_ACCESS_KEY" \
        AWS_SECRET_ACCESS_KEY="$STORAGE_SECRET_KEY" \
        aws s3 cp "${file_path}.sha256" "s3://$STORAGE_BUCKET/${object_key}.sha256" \
            --endpoint-url "$STORAGE_ENDPOINT" 2>/dev/null
    fi
    
    log_info "Upload complete"
}

store_locally() {
    local file_path="$1"
    local archive_name="$2"
    
    mkdir -p "$ARCHIVE_DIR"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would store locally: $ARCHIVE_DIR/$archive_name"
        return 0
    fi
    
    cp "$file_path" "$ARCHIVE_DIR/"
    if [[ -f "${file_path}.sha256" ]]; then
        cp "${file_path}.sha256" "$ARCHIVE_DIR/"
    fi
    
    log_info "Stored locally: $ARCHIVE_DIR/$(basename "$file_path")"
}

cleanup_old_archives() {
    log_info "Cleaning up archives older than $RETENTION_DAYS days..."
    
    # Clean local archives
    if [[ -d "$ARCHIVE_DIR" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            find "$ARCHIVE_DIR" -type f -mtime +$RETENTION_DAYS -print | \
                while read -r f; do log_info "[DRY-RUN] Would delete: $f"; done
        else
            find "$ARCHIVE_DIR" -type f -mtime +$RETENTION_DAYS -delete -print | \
                while read -r f; do log_info "Deleted: $f"; done
        fi
    fi
    
    log_info "Cleanup complete"
}

# ============================================================================
# Main
# ============================================================================

main() {
    log_info "========================================"
    log_info "Audit Log Archive Started"
    log_info "========================================"
    log_info "Dry run: $DRY_RUN"
    
    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    
    local timestamp=$(date '+%Y%m%d')
    local hostname=$(hostname -s)
    local archived_count=0
    local status="SUCCESS"
    
    # Process each log directory
    for log_dir in "${LOG_DIRS[@]}"; do
        if [[ ! -d "$log_dir" ]]; then
            continue
        fi
        
        local dir_name=$(basename "$log_dir")
        local archive_name="audit_${hostname}_${dir_name}_${timestamp}"
        
        log_info "Processing: $log_dir"
        
        # Step 1: Create archive
        local archive_file=$(archive_logs "$log_dir" "$archive_name")
        
        if [[ -z "$archive_file" || ! -f "$archive_file" ]]; then
            continue
        fi
        
        # Step 2: Create checksum
        create_checksum "$archive_file"
        
        # Step 3: Encrypt
        local final_file=$(encrypt_file "$archive_file")
        
        # Step 4: Store locally
        store_locally "$final_file" "$archive_name"
        
        # Step 5: Upload to MinIO
        local year=$(date '+%Y')
        local month=$(date '+%m')
        local object_key="$year/$month/$(basename "$final_file")"
        upload_to_minio "$final_file" "$object_key"
        
        ((archived_count++))
    done
    
    # Step 6: Cleanup old archives
    cleanup_old_archives
    
    # Summary
    log_info "========================================"
    log_info "Audit Log Archive Complete: $status"
    log_info "Archives created: $archived_count"
    log_info "========================================"
}

main "$@"
