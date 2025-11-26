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