Param(
  [Parameter(Mandatory=$true)][string]$Domain,
  [Parameter(Mandatory=$false)][string]$Email = "admin@$Domain"
)

Write-Host "Issuing Let's Encrypt certificate for $Domain (HTTP challenge)"

# Create challenge file
$challengeDir = "c:\\SweetNarcisse\\SweetNarcisse-demo\\certbot_www"
if (!(Test-Path $challengeDir)) { New-Item -ItemType Directory -Force -Path $challengeDir | Out-Null }

Write-Host "Starting nginx and app (for challenge serving)"
docker compose --env-file .env.production.local up -d nginx app

Write-Host "Requesting certificate via certbot (docker exec)"
docker run --rm -v sweetnarcisse-demo_certbot_www:/var/www/certbot -v sweetnarcisse-demo_certbot_etc:/etc/letsencrypt certbot/certbot certonly --webroot -w /var/www/certbot -d $Domain --email $Email --agree-tos --non-interactive

Write-Host "Certificate attempted. You can then update nginx to serve HTTPS."
