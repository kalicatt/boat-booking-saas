#
# Database Restore Test Script for Sweet Narcisse (PowerShell)
# Run monthly via Task Scheduler
#
# Validates backup integrity by:
#   1. Finding most recent backup
#   2. Restoring to a temporary database
#   3. Running validation queries
#   4. Cleaning up temp database
#   5. Alerting on failure
#
# Usage:
#   .\test-restore.ps1 [-DryRun] [-BackupFile <path>]
#

param(
    [switch]$DryRun,
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Database
$DatabaseUrl = $env:DATABASE_URL

# Paths
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups\db" }
$LogFile = if ($env:LOG_FILE) { $env:LOG_FILE } else { Join-Path $ProjectRoot "logs\test-restore.log" }

# Test database name
$TestDbName = "sweet_narcisse_restore_test_$(Get-Date -Format 'yyyyMMddHHmmss')"

# Notifications
$NotifyEmail = $env:NOTIFY_EMAIL
$SlackWebhook = $env:SLACK_WEBHOOK

# ============================================================================
# Logging
# ============================================================================

function Write-Log {
    param([string]$Level, [string]$Message)
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage
    
    $logDir = Split-Path -Parent $LogFile
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    Add-Content -Path $LogFile -Value $logMessage
}

function Write-LogInfo { param([string]$Message) Write-Log "INFO" $Message }
function Write-LogWarn { param([string]$Message) Write-Log "WARN" $Message }
function Write-LogError { param([string]$Message) Write-Log "ERROR" $Message }

# ============================================================================
# Utilities
# ============================================================================

function Parse-DatabaseUrl {
    param([string]$Url)
    
    Add-Type -AssemblyName System.Web
    $uri = [System.Uri]$Url.Replace("postgresql://", "http://").Replace("postgres://", "http://")
    
    $script:DbHost = $uri.Host
    $script:DbPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    $script:DbName = $uri.AbsolutePath.TrimStart('/')
    
    $userInfo = $uri.UserInfo
    if ($userInfo -match "^([^:]+):(.+)$") {
        $script:DbUser = $Matches[1]
        $script:DbPassword = [System.Web.HttpUtility]::UrlDecode($Matches[2])
    }
}

function Find-LatestBackup {
    if ($BackupFile -and (Test-Path $BackupFile)) {
        return $BackupFile
    }
    
    if ($BackupFile) {
        throw "Specified backup file not found: $BackupFile"
    }
    
    $latest = Get-ChildItem -Path $BackupDir -Filter "*.dump*" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    
    if (!$latest) {
        throw "No backup files found in $BackupDir"
    }
    
    return $latest.FullName
}

function Find-PostgresTools {
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\*\bin",
        "C:\Program Files (x86)\PostgreSQL\*\bin",
        "$env:ProgramFiles\PostgreSQL\*\bin"
    )
    
    foreach ($path in $pgPaths) {
        $found = Get-Item $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found -and (Test-Path (Join-Path $found.FullName "psql.exe"))) {
            return $found.FullName
        }
    }
    
    # Check if in PATH
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        return $null # Use from PATH
    }
    
    throw "PostgreSQL tools not found. Please install PostgreSQL client."
}

function Invoke-Psql {
    param([string]$Database, [string]$Command)
    
    $env:PGPASSWORD = $script:DbPassword
    
    try {
        $args = @(
            "--host=$($script:DbHost)",
            "--port=$($script:DbPort)",
            "--username=$($script:DbUser)",
            "--dbname=$Database",
            "--tuples-only",
            "--command=$Command"
        )
        
        $result = & psql @args 2>$null
        return ($result -join "`n").Trim()
    } finally {
        $env:PGPASSWORD = $null
    }
}

function New-TestDatabase {
    Write-LogInfo "Creating test database: $TestDbName"
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would create database: $TestDbName"
        return
    }
    
    $env:PGPASSWORD = $script:DbPassword
    
    try {
        $args = @(
            "--host=$($script:DbHost)",
            "--port=$($script:DbPort)",
            "--username=$($script:DbUser)",
            $TestDbName
        )
        
        & createdb @args 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create test database"
        }
    } finally {
        $env:PGPASSWORD = $null
    }
}

function Remove-TestDatabase {
    if ($DryRun) { return }
    
    Write-LogInfo "Cleaning up test database: $TestDbName"
    
    $env:PGPASSWORD = $script:DbPassword
    
    try {
        $args = @(
            "--host=$($script:DbHost)",
            "--port=$($script:DbPort)",
            "--username=$($script:DbUser)",
            "--if-exists",
            $TestDbName
        )
        
        & dropdb @args 2>$null
    } finally {
        $env:PGPASSWORD = $null
    }
}

function Restore-Backup {
    param([string]$BackupPath)
    
    Write-LogInfo "Restoring backup to test database..."
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would restore: $BackupPath -> $TestDbName"
        return
    }
    
    $env:PGPASSWORD = $script:DbPassword
    
    try {
        $args = @(
            "--host=$($script:DbHost)",
            "--port=$($script:DbPort)",
            "--username=$($script:DbUser)",
            "--dbname=$TestDbName",
            "--no-owner",
            "--no-acl",
            $BackupPath
        )
        
        & pg_restore @args 2>$null
        # pg_restore may return non-zero for warnings, check if data exists
        
        Write-LogInfo "Restore completed"
    } finally {
        $env:PGPASSWORD = $null
    }
}

function Test-RestoredData {
    Write-LogInfo "Running validation queries..."
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would run validation queries"
        return $true
    }
    
    $allPassed = $true
    
    # Check 1: Table count
    $tableCount = Invoke-Psql -Database $TestDbName -Command "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCount = [int]$tableCount
    
    if ($tableCount -lt 5) {
        Write-LogError "Validation failed: Only $tableCount tables found (expected >= 5)"
        $allPassed = $false
    } else {
        Write-LogInfo "✓ Table count: $tableCount"
    }
    
    # Check 2: Critical tables
    $criticalTables = @("User", "Booking", "Boat", "Schedule")
    foreach ($table in $criticalTables) {
        $exists = Invoke-Psql -Database $TestDbName -Command "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '$table');"
        
        if ($exists -ne "t") {
            Write-LogError "Validation failed: Table '$table' not found"
            $allPassed = $false
        } else {
            Write-LogInfo "✓ Table exists: $table"
        }
    }
    
    # Check 3: Booking count
    $bookingCount = Invoke-Psql -Database $TestDbName -Command 'SELECT COUNT(*) FROM "Booking";'
    Write-LogInfo "✓ Booking records: $bookingCount"
    
    if ($allPassed) {
        Write-LogInfo "All validation checks passed!"
    }
    
    return $allPassed
}

function Send-Alert {
    param([string]$Status, [string]$Message)
    
    $subject = "[Sweet Narcisse] Restore Test: $Status"
    $body = @"
Restore test completed on $env:COMPUTERNAME at $(Get-Date).

Status: $Status

$Message

Backup tested: $(Split-Path -Leaf $script:BackupFile)
Test database: $TestDbName
"@

    # Could add email/Slack notifications here
    Write-LogInfo "Alert: $Status - $Message"
}

# ============================================================================
# Main
# ============================================================================

function Main {
    Write-LogInfo "========================================"
    Write-LogInfo "Restore Test Started"
    Write-LogInfo "========================================"
    Write-LogInfo "Dry run: $DryRun"
    
    # Pre-flight checks
    if ([string]::IsNullOrEmpty($DatabaseUrl)) {
        throw "DATABASE_URL is required"
    }
    
    $pgBin = Find-PostgresTools
    if ($pgBin) {
        $env:PATH = "$pgBin;$env:PATH"
    }
    
    Parse-DatabaseUrl -Url $DatabaseUrl
    
    $status = "SUCCESS"
    $message = ""
    $startTime = Get-Date
    
    try {
        # Step 1: Find backup
        Write-LogInfo "Step 1: Finding backup..."
        $script:BackupFile = Find-LatestBackup
        Write-LogInfo "Using backup: $($script:BackupFile)"
        
        # Step 2: Create test database
        Write-LogInfo "Step 2: Creating test database..."
        New-TestDatabase
        
        # Step 3: Restore backup
        Write-LogInfo "Step 3: Restoring backup..."
        Restore-Backup -BackupPath $script:BackupFile
        
        # Step 4: Validate
        Write-LogInfo "Step 4: Validating restored data..."
        if (!(Test-RestoredData)) {
            $status = "FAILED"
            $message = "Validation queries failed"
        } else {
            $message = "Restore test completed successfully."
        }
        
    } catch {
        $status = "FAILED"
        $message = $_.Exception.Message
    } finally {
        # Cleanup
        Remove-TestDatabase
    }
    
    $duration = (Get-Date) - $startTime
    
    Write-LogInfo "========================================"
    Write-LogInfo "Restore Test Complete: $status"
    Write-LogInfo "Duration: $([math]::Round($duration.TotalSeconds, 1))s"
    Write-LogInfo "========================================"
    
    Send-Alert -Status $status -Message $message
    
    if ($status -eq "FAILED") {
        throw "Restore test failed: $message"
    }
}

Main
