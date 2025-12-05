# --- CONFIGURATION ---
$backupDir = ".\backups"
$maxBackups = 2
$containerName = "sweet_narcisse_db"
$dbUser = "sweet_admin"

# Date du jour
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "$backupDir\backup_$timestamp.sql"

# Créer le dossier s'il n'existe pas
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "--- DÉBUT MAINTENANCE ---" -ForegroundColor Cyan

# 1. NETTOYAGE DES VIEILLES DONNÉES
Write-Host "1. Nettoyage des données > 1 an..."
call npx tsx prisma/prune.ts

# 1.b. Annulation des réservations en attente trop anciennes
Write-Host "1.b. Annulation des réservations PENDING trop anciennes..."
call npx tsx prisma/cleanup-pending.ts

# 2. SAUVEGARDE (DUMP)
Write-Host "2. Création de la sauvegarde : $filename"
# Note: On utilise docker exec pour extraire les données
docker exec -t $containerName pg_dumpall -c -U $dbUser > $filename

# 3. ROTATION (Garder les 2 plus récents)
Write-Host "3. Rotation des fichiers (Max: $maxBackups)"
$files = Get-ChildItem -Path $backupDir -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending

if ($files.Count -gt $maxBackups) {
    $files | Select-Object -Skip $maxBackups | ForEach-Object {
        Write-Host "Suppression de l'ancienne sauvegarde : $_" -ForegroundColor Yellow
        Remove-Item $_.FullName
    }
}

Write-Host "✅ Maintenance terminée avec succès !" -ForegroundColor Green

# 4. Rotation quotidienne des avis & mise à jour éventuelle du compteur
Write-Host "4. Rotation des avis (TripAdvisor style)"
$featuredPath = "./public/reviews-featured.json"
$reviewIds = @('tp-1','tp-2','tp-3','tp-4')
$dayOfYear = (Get-Date).DayOfYear
$count = 3
$offset = $dayOfYear % $reviewIds.Count
$selected = @()
for ($i=0; $i -lt [Math]::Min($count, $reviewIds.Count); $i++) {
    $selected += $reviewIds[($offset + $i) % $reviewIds.Count]
}

# Mise à jour du reviewCount via variable d'environnement si définie
$envReviewCount = $env:TRIPADVISOR_REVIEW_COUNT
if ($envReviewCount -and $envReviewCount -match '^[0-9]+$') {
    Write-Host "Mise à jour reviewCount -> $envReviewCount"
    # On écrit la valeur dans le JSON (et non directement dans le TS pour éviter un rebuild automatique)
    $aggregate = @{ reviewCount = [int]$envReviewCount }
} else {
    $aggregate = @{}
}

$json = @{ featured = $selected; generatedAt = (Get-Date).ToString('o'); aggregate = $aggregate } | ConvertTo-Json -Depth 3
Set-Content -Path $featuredPath -Value $json -Encoding UTF8
Write-Host "Fichier $featuredPath généré." -ForegroundColor Green

Write-Host "--- FIN ÉTAPE AVIS ---" -ForegroundColor Cyan

# 5. Vérification Fleet & Safety
Write-Host "5. Vérification des batteries & maintenance..."
$fleetEndpoint = $env:FLEET_STATUS_ENDPOINT
if (-not $fleetEndpoint -or $fleetEndpoint -eq '') {
    $fleetEndpoint = "http://localhost:3000/api/admin/fleet/check-status"
}
$fleetHeaders = @{}
if ($env:FLEET_MAINTENANCE_KEY -and $env:FLEET_MAINTENANCE_KEY -ne '') {
    $fleetHeaders["x-maintenance-key"] = $env:FLEET_MAINTENANCE_KEY
}
try {
    if ($fleetHeaders.Count -gt 0) {
        $fleetReport = Invoke-RestMethod -Uri $fleetEndpoint -Method Post -Headers $fleetHeaders
    } else {
        $fleetReport = Invoke-RestMethod -Uri $fleetEndpoint -Method Post
    }
    $critical = $fleetReport.totals.critical
    $warning = $fleetReport.totals.warning
    $mechanical = $fleetReport.totals.mechanical
    Write-Host "Fleet: $critical critiques, $warning à charger, $mechanical révisions" -ForegroundColor Yellow
    if ($critical -gt 0) { Write-Warning "Des batteries critiques nécessitent une charge immédiate." }
    if ($mechanical -gt 0) { Write-Warning "Des barques dépassent le seuil mécanique." }
} catch {
    Write-Warning "Impossible de récupérer l'état Fleet ($($_.Exception.Message))."
}

# 6. Envoi des demandes d'avis (Expérience Client)
Write-Host "6. Envoi des demandes d'avis (Expérience Client)..." -ForegroundColor Cyan
$reviewEndpoint = $env:REVIEW_CRON_ENDPOINT
if (-not $reviewEndpoint -or $reviewEndpoint -eq '') {
    $reviewEndpoint = "http://localhost:3000/api/cron/send-reviews"
}

$reviewHeaders = @{}
if ($env:CRON_SECRET -and $env:CRON_SECRET -ne '') {
    $reviewHeaders["x-cron-key"] = $env:CRON_SECRET
}

try {
    if ($reviewHeaders.Count -gt 0) {
        $reviewReport = Invoke-RestMethod -Uri $reviewEndpoint -Method Post -Headers $reviewHeaders
    } else {
        $reviewReport = Invoke-RestMethod -Uri $reviewEndpoint -Method Post
    }
    Write-Host "✅ Demandes d'avis traitées : $($reviewReport.processed) / $($reviewReport.total)" -ForegroundColor Green
    if ($reviewReport.failures -and $reviewReport.failures.Count -gt 0) {
        Write-Warning "Certaines demandes d'avis ont échoué (voir logs)."
    }
} catch {
    Write-Host "⚠️ Erreur lors de l'envoi des demandes d'avis : $_" -ForegroundColor Red
}

Write-Host "--- FIN MAINTENANCE ---" -ForegroundColor Cyan