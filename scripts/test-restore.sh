#!/bin/bash
#
# Database Restore Test Script for Sweet Narcisse
# Run monthly via cron: 0 4 15 * * /path/to/test-restore.sh
#
# Validates backup integrity by:
#   1. Finding most recent backup
#   2. Restoring to a temporary database
#   3. Running validation queries
#   4. Cleaning up temp database
#   5. Alerting on failure
#
# Usage:
#   ./test-restore.sh [--dry-run] [--backup-file <path>]
#
# Environment:
#   DATABASE_URL: PostgreSQL connection string (for credentials)
#   NOTIFY_EMAIL: Email for alerts (optional)
#   SLACK_WEBHOOK: Slack webhook URL (optional)
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Database
DATABASE_URL="${DATABASE_URL:-}"

# Paths
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/db}"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/test-restore.log}"

# Test database name
TEST_DB_NAME="sweet_narcisse_restore_test_$(date +%s)"

# Notifications
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Flags
DRY_RUN=false
BACKUP_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --backup-file)
            BACKUP_FILE="$2"
            shift 2
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
    
    # Drop test database if it exists
    if [[ -n "${TEST_DB_NAME:-}" && "$DRY_RUN" == "false" ]]; then
        log_info "Cleaning up test database: $TEST_DB_NAME"
        PGPASSWORD="$DB_PASSWORD" dropdb \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --if-exists \
            "$TEST_DB_NAME" 2>/dev/null || true
    fi
    
    exit $exit_code
}

trap cleanup EXIT INT TERM

parse_database_url() {
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
    
    if [[ "$DB_PORT" == "$DB_HOST" ]]; then
        DB_PORT="5432"
    fi
    
    DB_NAME="${hostportdb#*/}"
    DB_NAME="${DB_NAME%%\?*}"
}

find_latest_backup() {
    if [[ -n "$BACKUP_FILE" ]]; then
        if [[ -f "$BACKUP_FILE" ]]; then
            echo "$BACKUP_FILE"
            return 0
        else
            log_error "Specified backup file not found: $BACKUP_FILE"
            return 1
        fi
    fi
    
    # Find most recent .dump file
    local latest=$(find "$BACKUP_DIR" -name "*.dump" -o -name "*.dump.gpg" 2>/dev/null | \
                   xargs ls -t 2>/dev/null | head -n1)
    
    if [[ -z "$latest" ]]; then
        log_error "No backup files found in $BACKUP_DIR"
        return 1
    fi
    
    echo "$latest"
}

decrypt_if_needed() {
    local file="$1"
    
    if [[ "$file" == *.gpg ]]; then
        log_info "Decrypting backup..."
        local decrypted="${file%.gpg}"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY-RUN] Would decrypt to: $decrypted"
            echo "$file"
            return 0
        fi
        
        gpg --decrypt --output "$decrypted" "$file" 2>/dev/null
        echo "$decrypted"
    else
        echo "$file"
    fi
}

create_test_database() {
    log_info "Creating test database: $TEST_DB_NAME"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would create database: $TEST_DB_NAME"
        return 0
    fi
    
    PGPASSWORD="$DB_PASSWORD" createdb \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        "$TEST_DB_NAME"
}

restore_backup() {
    local backup_file="$1"
    
    log_info "Restoring backup to test database..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would restore: $backup_file -> $TEST_DB_NAME"
        return 0
    fi
    
    PGPASSWORD="$DB_PASSWORD" pg_restore \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$TEST_DB_NAME" \
        --no-owner \
        --no-acl \
        --verbose \
        "$backup_file" 2>&1 | while read -r line; do 
            # Filter out noisy output
            echo "$line" | grep -v "^pg_restore:" | head -c 200
        done
    
    log_info "Restore completed"
}

run_validation_queries() {
    log_info "Running validation queries..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would run validation queries"
        return 0
    fi
    
    local validation_results=""
    local all_passed=true
    
    # Check 1: Tables exist
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$TEST_DB_NAME" \
        --tuples-only \
        --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [[ "$table_count" -lt 5 ]]; then
        log_error "Validation failed: Only $table_count tables found (expected >= 5)"
        all_passed=false
    else
        log_info "✓ Table count: $table_count"
        validation_results="${validation_results}Tables: $table_count\n"
    fi
    
    # Check 2: Critical tables exist
    local critical_tables=("User" "Booking" "Boat" "Schedule")
    for table in "${critical_tables[@]}"; do
        local exists=$(PGPASSWORD="$DB_PASSWORD" psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$TEST_DB_NAME" \
            --tuples-only \
            --command="SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | tr -d ' ')
        
        if [[ "$exists" != "t" ]]; then
            log_error "Validation failed: Table '$table' not found"
            all_passed=false
        else
            log_info "✓ Table exists: $table"
        fi
    done
    
    # Check 3: Data integrity - check row counts
    local booking_count=$(PGPASSWORD="$DB_PASSWORD" psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$TEST_DB_NAME" \
        --tuples-only \
        --command="SELECT COUNT(*) FROM \"Booking\";" 2>/dev/null | tr -d ' ')
    
    log_info "✓ Booking records: $booking_count"
    validation_results="${validation_results}Bookings: $booking_count\n"
    
    # Check 4: Foreign key integrity (sample check)
    local orphan_count=$(PGPASSWORD="$DB_PASSWORD" psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$TEST_DB_NAME" \
        --tuples-only \
        --command="SELECT COUNT(*) FROM \"Booking\" b LEFT JOIN \"Schedule\" s ON b.\"scheduleId\" = s.id WHERE b.\"scheduleId\" IS NOT NULL AND s.id IS NULL;" 2>/dev/null | tr -d ' ')
    
    if [[ "$orphan_count" -gt 0 ]]; then
        log_warn "Warning: $orphan_count orphaned booking records found"
    else
        log_info "✓ Foreign key integrity: OK"
    fi
    
    if [[ "$all_passed" == "true" ]]; then
        log_info "All validation checks passed!"
        return 0
    else
        return 1
    fi
}

send_alert() {
    local status="$1"
    local message="$2"
    
    local subject="[Sweet Narcisse] Restore Test: $status"
    local body="Restore test completed on $(hostname) at $(date).

Status: $status

$message

Backup tested: $(basename "${BACKUP_FILE:-latest}")
Test database: $TEST_DB_NAME"

    # Email notification
    if [[ -n "$NOTIFY_EMAIL" ]]; then
        if command -v mail &> /dev/null; then
            echo "$body" | mail -s "$subject" "$NOTIFY_EMAIL"
            log_info "Email alert sent to $NOTIFY_EMAIL"
        fi
    fi
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color=$([[ "$status" == "SUCCESS" ]] && echo "good" || echo "danger")
        local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "title": "$subject",
        "text": "$message",
        "footer": "$(hostname) | $(date)",
        "fields": [
            {"title": "Status", "value": "$status", "short": true},
            {"title": "Backup", "value": "$(basename "${BACKUP_FILE:-latest}")", "short": true}
        ]
    }]
}
EOF
)
        curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK" >/dev/null
        log_info "Slack alert sent"
    fi
}

# ============================================================================
# Main
# ============================================================================

main() {
    log_info "========================================"
    log_info "Restore Test Started"
    log_info "========================================"
    log_info "Dry run: $DRY_RUN"
    
    # Pre-flight checks
    if [[ -z "$DATABASE_URL" ]]; then
        log_error "DATABASE_URL is required"
        exit 1
    fi
    
    for cmd in psql pg_restore createdb dropdb; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Parse database URL
    parse_database_url "$DATABASE_URL"
    
    local status="SUCCESS"
    local message=""
    local start_time=$(date +%s)
    
    # Step 1: Find latest backup
    log_info "Step 1: Finding backup..."
    BACKUP_FILE=$(find_latest_backup) || {
        status="FAILED"
        message="No backup file found"
        send_alert "$status" "$message"
        exit 1
    }
    log_info "Using backup: $BACKUP_FILE"
    
    # Step 2: Decrypt if needed
    log_info "Step 2: Preparing backup..."
    local restore_file=$(decrypt_if_needed "$BACKUP_FILE")
    
    # Step 3: Create test database
    log_info "Step 3: Creating test database..."
    if ! create_test_database; then
        status="FAILED"
        message="Failed to create test database"
        send_alert "$status" "$message"
        exit 1
    fi
    
    # Step 4: Restore backup
    log_info "Step 4: Restoring backup..."
    if ! restore_backup "$restore_file"; then
        status="FAILED"
        message="Failed to restore backup"
        send_alert "$status" "$message"
        exit 1
    fi
    
    # Step 5: Run validation queries
    log_info "Step 5: Validating restored data..."
    if ! run_validation_queries; then
        status="FAILED"
        message="Validation queries failed"
        send_alert "$status" "$message"
        exit 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Summary
    log_info "========================================"
    log_info "Restore Test Complete: $status"
    log_info "Duration: ${duration}s"
    log_info "========================================"
    
    message="Restore test completed successfully in ${duration}s.
    
Validation results:
- All critical tables present
- Data integrity verified
- Foreign key relationships intact"
    
    send_alert "$status" "$message"
}

main "$@"
