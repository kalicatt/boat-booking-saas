#
# Secret Rotation Script for Sweet Narcisse (PowerShell)
# Run monthly via Task Scheduler or cron
#
# Rotates:
#   - NEXTAUTH_SECRET (critical)
#
# Usage:
#   .\rotate-secrets.ps1 [-DryRun] [-Force]
#

param(
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { Join-Path $ProjectRoot ".env.production.local" }
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $ProjectRoot "backups\secrets" }
$LogFile = if ($env:LOG_FILE) { $env:LOG_FILE } else { Join-Path $ProjectRoot "logs\secret-rotation.log" }
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

function New-Secret {
    # Generate 64 character base64-encoded random string
    # Use RNGCryptoServiceProvider for PowerShell 5.1 compatibility
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $bytes = New-Object byte[] 48
    $rng.GetBytes($bytes)
    $rng.Dispose()
    [Convert]::ToBase64String($bytes)
}

function Backup-EnvFile {
    if (!(Test-Path $EnvFile)) {
        Write-LogWarn "No existing env file to backup: $EnvFile"
        return
    }
    
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "env.$timestamp.bak"
    $backupPath = Join-Path $BackupDir $backupName
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would backup to: $backupPath"
    } else {
        Copy-Item $EnvFile $backupPath
        Write-LogInfo "Created backup: $backupPath"
        
        # Keep only last 6 backups (6 months)
        Get-ChildItem -Path $BackupDir -Filter "env.*.bak" |
            Sort-Object CreationTime -Descending |
            Select-Object -Skip 6 |
            Remove-Item -Force
    }
}

function Update-EnvVar {
    param(
        [string]$VarName,
        [string]$NewValue,
        [string]$File
    )
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would update $VarName in $File"
        return
    }
    
    # Create file if doesn't exist
    if (!(Test-Path $File)) {
        New-Item -ItemType File -Path $File -Force | Out-Null
    }
    
    $content = Get-Content $File -Raw -ErrorAction SilentlyContinue
    
    if ($content -match "^$VarName=") {
        # Update existing variable
        $content = $content -replace "(?m)^$VarName=.*$", "$VarName=$NewValue"
        Set-Content -Path $File -Value $content -NoNewline
        Write-LogInfo "Updated existing $VarName"
    } else {
        # Append new variable
        Add-Content -Path $File -Value "$VarName=$NewValue"
        Write-LogInfo "Added new $VarName"
    }
}

function Restart-Application {
    Write-LogInfo "Initiating application restart..."
    
    if ($DryRun) {
        Write-LogInfo "[DRY-RUN] Would restart application"
        return $true
    }
    
    # Method 1: Docker Compose (production)
    $dockerCompose = Join-Path $ProjectRoot "docker-compose.yml"
    if ((Test-Path $dockerCompose) -and (Get-Command docker -ErrorAction SilentlyContinue)) {
        Push-Location $ProjectRoot
        try {
            docker compose restart app 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-LogInfo "Restarted via docker compose"
                return $true
            }
        } finally {
            Pop-Location
        }
    }
    
    # Method 2: Windows Service
    $service = Get-Service -Name "SweetNarcisse" -ErrorAction SilentlyContinue
    if ($service) {
        Restart-Service -Name "SweetNarcisse"
        Write-LogInfo "Restarted via Windows Service"
        return $true
    }
    
    # Method 3: PM2
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        pm2 restart sweet-narcisse 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-LogInfo "Restarted via PM2"
            return $true
        }
    }
    
    Write-LogWarn "Could not auto-restart application. Please restart manually."
    return $false
}

# ============================================================================
# Main rotation logic
# ============================================================================

function Update-NextAuthSecret {
    Write-LogInfo "=== Rotating NEXTAUTH_SECRET ==="
    
    $newSecret = New-Secret
    
    Backup-EnvFile
    Update-EnvVar -VarName "NEXTAUTH_SECRET" -NewValue $newSecret -File $EnvFile
    
    Write-LogInfo "NEXTAUTH_SECRET rotated successfully"
    return $true
}

function Test-RotationNeeded {
    # Force rotation always runs
    if ($Force) {
        return $true
    }
    
    # Check if it's been at least 25 days since last rotation
    $markerFile = Join-Path $BackupDir ".last_rotation"
    
    if (Test-Path $markerFile) {
        $lastRotation = [DateTime]::Parse((Get-Content $markerFile))
        $daysSince = (Get-Date).Subtract($lastRotation).Days
        
        if ($daysSince -lt 25) {
            Write-LogInfo "Last rotation was $daysSince days ago. Skipping (run with -Force to override)"
            return $false
        }
    }
    
    return $true
}

function Update-RotationMarker {
    if ($DryRun) {
        return
    }
    
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    Set-Content -Path (Join-Path $BackupDir ".last_rotation") -Value (Get-Date -Format "o")
}

# ============================================================================
# Main
# ============================================================================

function Main {
    Write-LogInfo "========================================"
    Write-LogInfo "Secret Rotation Started"
    Write-LogInfo "========================================"
    Write-LogInfo "Environment file: $EnvFile"
    Write-LogInfo "Dry run: $DryRun"
    Write-LogInfo "Force: $Force"
    
    # Check if rotation is needed
    if (!(Test-RotationNeeded)) {
        return
    }
    
    $rotationStatus = "SUCCESS"
    $rotationErrors = @()
    
    # Rotate NEXTAUTH_SECRET
    try {
        if (!(Update-NextAuthSecret)) {
            $rotationStatus = "FAILED"
            $rotationErrors += "NEXTAUTH_SECRET rotation failed"
        }
    } catch {
        $rotationStatus = "FAILED"
        $rotationErrors += "NEXTAUTH_SECRET rotation error: $_"
    }
    
    # Update marker
    if ($rotationStatus -eq "SUCCESS") {
        Update-RotationMarker
    }
    
    # Restart application
    if (!$DryRun -and $rotationStatus -eq "SUCCESS") {
        if (!(Restart-Application)) {
            $rotationErrors += "Application restart failed - manual restart required"
        }
    }
    
    # Summary
    Write-LogInfo "========================================"
    Write-LogInfo "Secret Rotation Complete: $rotationStatus"
    Write-LogInfo "========================================"
    
    if ($rotationErrors.Count -gt 0) {
        Write-LogWarn "Errors encountered:"
        foreach ($err in $rotationErrors) {
            Write-LogWarn "  - $err"
        }
    }
    
    if ($rotationStatus -eq "FAILED") {
        throw "Secret rotation failed"
    }
}

Main
