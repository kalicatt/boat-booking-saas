param(
    [string]$Hostname = "sweet.local",
    [string]$LanAddress = "192.168.1.80",
    [string]$CertDirectory = "certs",
    [string]$CertFile = "dev-cert.pem",
    [string]$KeyFile = "dev-key.pem"
)

$ErrorActionPreference = "Stop"

function Write-Info($message) {
    Write-Host "[dev-https] $message"
}

$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
if (-not $mkcert) {
    throw "mkcert is required. Install it via 'choco install mkcert' (Windows) or https://github.com/FiloSottile/mkcert."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$fullCertDir = Join-Path $repoRoot $CertDirectory
if (-not (Test-Path $fullCertDir)) {
    Write-Info "Creating certificate directory: $fullCertDir"
    New-Item -ItemType Directory -Path $fullCertDir | Out-Null
}

$certPath = Join-Path $fullCertDir $CertFile
$keyPath = Join-Path $fullCertDir $KeyFile

$names = @()
foreach ($value in @($Hostname, $LanAddress, "localhost", "127.0.0.1", "::1")) {
    if ([string]::IsNullOrWhiteSpace($value)) { continue }
    if (-not $names.Contains($value)) { $names += $value }
}

Write-Info "Generating certificate for: $($names -join ', ')"

$arguments = @("-cert-file", $certPath, "-key-file", $keyPath) + $names
& $mkcert @arguments

Write-Info "Certificate written to $certPath"
Write-Info "Private key written to $keyPath"
Write-Info "Add '$Hostname' pointing to $LanAddress in your hosts file before running npm run dev:https"
