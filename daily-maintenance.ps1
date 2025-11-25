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