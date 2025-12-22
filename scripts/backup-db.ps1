#
# Database Backup Script for Sweet Narcisse (PowerShell)
# Run every 6 hours via Task Scheduler
#
# Features:
#   - PostgreSQL dump with compression
#   - Optional GPG encryption
#   - Upload to MinIO (S3-compatible)
#   - Automatic retention (30 days)
#
# Usage:
#   .\backup-db.ps1 [-DryRun] [-NoUpload] [-NoEncrypt]
#

param(
    [switch]$DryRun,
    [switch]$NoUpload,
    [switch]$NoEncrypt
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Database
$DatabaseUrl = $env:DATABASE_URL

# Storage
$StorageEndpoint = if ($env:STORAGE_ENDPOINT) { $env:STORAGE_ENDPOINT } else { "http://localhost:9000" }
$StorageAccessKey = $env:STORAGE_ACCESS_KEY
$StorageSecretKey = $env:STORAGE_SECRET_KEY
$StorageBucket = if ($env:STORAGE_BUCKET) { $env:STORAGE_BUCKET } else { "sweet-backups" }

# Encryption
$GpgRecipient = $env:GPG_RECIPIENT

# Local paths
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups\db" }
$LogFile = if ($env:LOG_FILE) { $env:LOG_FILE } else { Join-Path $ProjectRoot "logs\backup-db.log" }

# Retention
$RetentionDays = if ($env:RETENTION_DAYS) { [int]$env:RETENTION_DAYS } else { 30 }

# Notifications (reserved for future email alerts)
# $NotifyEmail = $env:NOTIFY_EMAIL

# ============================================================================
# Logging
# ============================================================================

function Write-Log {
    param(
        [string]$Level,
        [string]$Message
    )
    
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

function ConvertFrom-DatabaseUrl {
    param([string]$Url)
    
    # Format: postgresql://user:password@host:port/database
    $uri = [System.Uri]$Url.Replace("postgresql://", "http://").Replace("postgres://", "http://")
    
    $script:DbHost = $uri.Host
    $script:DbPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    $script:DbName = $uri.AbsolutePath.TrimStart('/')
    
    # Parse credentials from UserInfo
    $userInfo = $uri.UserInfo
    if ($userInfo -match "^([^:]+):(.+)$") {
        $script:DbUser = $Matches[1]
        $script:DbPassword = [System.Web.HttpUtility]::UrlDecode($Matches[2])
    }
}

function New-Backup {
    param(
        [string]$BackupName,
        [string]$OutputFile
    )
    
    Write-LogInfo "Creating PostgreSQL backup: $BackupName"
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would create backup to: $OutputFile"
        New-Item -ItemType File -Path $OutputFile -Force | Out-Null
        return $true
    }
    
    # Parse database URL
    ConvertFrom-DatabaseUrl -Url $DatabaseUrl
    
    # Set environment for pg_dump
    $env:PGPASSWORD = $script:DbPassword
    
    try {
        # Find pg_dump
        $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
        if (!$pgDump) {
            # Try common Windows locations
            $pgPaths = @(
                "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
                "C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe"
            )
            foreach ($path in $pgPaths) {
                $found = Get-Item $path -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    $pgDump = $found.FullName
                    break
                }
            }
        }
        
        if (!$pgDump) {
            throw "pg_dump not found. Please install PostgreSQL client tools."
        }
        
        $pgDumpPath = if ($pgDump -is [string]) { $pgDump } else { $pgDump.Source }
        
        # Run pg_dump
        $pgArgs = @(
            "--host=$($script:DbHost)",
            "--port=$($script:DbPort)",
            "--username=$($script:DbUser)",
            "--dbname=$($script:DbName)",
            "--format=custom",
            "--compress=9",
            "--file=$OutputFile"
        )
        
        $process = Start-Process -FilePath $pgDumpPath -ArgumentList $pgArgs -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -ne 0) {
            throw "pg_dump failed with exit code: $($process.ExitCode)"
        }
        
        if (!(Test-Path $OutputFile)) {
            throw "Backup file was not created"
        }
        
        $size = (Get-Item $OutputFile).Length
        Write-LogInfo "Backup created: $([math]::Round($size / 1MB, 2)) MB"
        return $true
    } finally {
        $env:PGPASSWORD = $null
    }
}

function Protect-BackupFile {
    param(
        [string]$InputFile,
        [string]$OutputFile
    )
    
    if ($NoEncrypt -or [string]::IsNullOrEmpty($GpgRecipient)) {
        Write-LogInfo "Encryption skipped (no GPG recipient configured)"
        Copy-Item $InputFile $OutputFile
        return $true
    }
    
    Write-LogInfo "Encrypting backup with GPG..."
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would encrypt to: $OutputFile"
        Copy-Item $InputFile $OutputFile
        return $true
    }
    
    $gpg = Get-Command gpg -ErrorAction SilentlyContinue
    if (!$gpg) {
        Write-LogWarn "GPG not found, skipping encryption"
        Copy-Item $InputFile $OutputFile
        return $true
    }
    
    $gpgArgs = @(
        "--encrypt",
        "--recipient", $GpgRecipient,
        "--output", $OutputFile,
        "--trust-model", "always",
        $InputFile
    )
    
    $process = Start-Process -FilePath gpg -ArgumentList $gpgArgs -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -ne 0) {
        throw "GPG encryption failed"
    }
    
    Write-LogInfo "Backup encrypted successfully"
    return $true
}

function Send-ToMinio {
    param(
        [string]$FilePath,
        [string]$ObjectKey
    )
    
    if ($NoUpload) {
        Write-LogInfo "Upload skipped (-NoUpload flag)"
        return $true
    }
    
    if ([string]::IsNullOrEmpty($StorageAccessKey) -or [string]::IsNullOrEmpty($StorageSecretKey)) {
        Write-LogWarn "MinIO credentials not configured, skipping upload"
        return $true
    }
    
    Write-LogInfo "Uploading to MinIO: $ObjectKey"
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would upload to: s3://$StorageBucket/$ObjectKey"
        return $true
    }
    
    # Use AWS CLI
    $env:AWS_ACCESS_KEY_ID = $StorageAccessKey
    $env:AWS_SECRET_ACCESS_KEY = $StorageSecretKey
    
    try {
        $awsArgs = @(
            "s3", "cp",
            $FilePath,
            "s3://$StorageBucket/$ObjectKey",
            "--endpoint-url", $StorageEndpoint
        )
        
        $process = Start-Process -FilePath aws -ArgumentList $awsArgs -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -ne 0) {
            throw "S3 upload failed"
        }
        
        Write-LogInfo "Upload complete"
        return $true
    } finally {
        $env:AWS_ACCESS_KEY_ID = $null
        $env:AWS_SECRET_ACCESS_KEY = $null
    }
}

function Remove-OldBackups {
    Write-LogInfo "Cleaning up backups older than $RetentionDays days..."
    
    # Clean local backups
    if (Test-Path $BackupDir) {
        $cutoff = (Get-Date).AddDays(-$RetentionDays)
        
        Get-ChildItem -Path $BackupDir -Filter "*.dump*" -File | 
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            ForEach-Object {
                if ($DryRun) {
                    Write-LogInfo "[DRY-RUN] Would delete: $($_.FullName)"
                } else {
                    Remove-Item $_.FullName -Force
                    Write-LogInfo "Deleted local: $($_.Name)"
                }
            }
    }
    
    Write-LogInfo "Cleanup complete"
}

# ============================================================================
# Main
# ============================================================================

function Main {
    Write-LogInfo "========================================"
    Write-LogInfo "Database Backup Started"
    Write-LogInfo "========================================"
    Write-LogInfo "Dry run: $DryRun"
    Write-LogInfo "Upload: $(if ($NoUpload) { 'disabled' } else { 'enabled' })"
    Write-LogInfo "Encrypt: $(if ($NoEncrypt) { 'disabled' } else { 'enabled' })"
    
    # Pre-flight checks
    if ([string]::IsNullOrEmpty($DatabaseUrl)) {
        Write-LogError "DATABASE_URL is required"
        throw "DATABASE_URL is required"
    }
    
    # Load System.Web for URL decoding
    Add-Type -AssemblyName System.Web
    
    # Create backup directory
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    # Generate backup name
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "sweet_narcisse_$timestamp"
    
    # Temp file for backup
    $tempFile = Join-Path $BackupDir "$backupName.dump"
    $encryptedFile = $null
    $finalFile = $null
    
    $status = "SUCCESS"
    $errors = @()
    
    try {
        # Step 1: Create backup
        if (!(New-Backup -BackupName $backupName -OutputFile $tempFile)) {
            $status = "FAILED"
            $errors += "Backup creation failed"
        }
        
        # Step 2: Encrypt (if enabled)
        if ($status -eq "SUCCESS" -and (Test-Path $tempFile)) {
            if ($NoEncrypt -or [string]::IsNullOrEmpty($GpgRecipient)) {
                $finalFile = $tempFile
            } else {
                $encryptedFile = "$tempFile.gpg"
                if (!(Protect-BackupFile -InputFile $tempFile -OutputFile $encryptedFile)) {
                    $status = "FAILED"
                    $errors += "Encryption failed"
                } else {
                    $finalFile = $encryptedFile
                    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                }
            }
        }
        
        # Step 3: Upload to MinIO
        if ($status -eq "SUCCESS" -and $finalFile -and (Test-Path $finalFile)) {
            $objectKey = "backups/$(Split-Path -Leaf $finalFile)"
            if (!(Send-ToMinio -FilePath $finalFile -ObjectKey $objectKey)) {
                $status = "PARTIAL"
                $errors += "Upload failed (local backup preserved)"
            }
        }
        
        # Step 4: Cleanup old backups
        Remove-OldBackups
        
    } catch {
        $status = "FAILED"
        $errors += $_.Exception.Message
    }
    
    # Summary
    Write-LogInfo "========================================"
    Write-LogInfo "Database Backup Complete: $status"
    if ($finalFile -and (Test-Path $finalFile)) {
        $size = (Get-Item $finalFile).Length
        Write-LogInfo "Backup file: $finalFile"
        Write-LogInfo "Backup size: $([math]::Round($size / 1MB, 2)) MB"
    }
    Write-LogInfo "========================================"
    
    if ($errors.Count -gt 0) {
        Write-LogWarn "Errors encountered:"
        foreach ($err in $errors) {
            Write-LogWarn "  - $err"
        }
    }
    
    if ($status -eq "FAILED") {
        throw "Database backup failed"
    }
}

Main
