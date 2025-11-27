Param(
  [string]$Domain,
  [string]$EmailSender,
  [string]$NextAuthSecret,
  [string]$ResendApiKey,
  [string]$RecaptchaSecret,
  [string]$SmtpHost,
  [int]$SmtpPort = 587,
  [string]$SmtpUser,
  [string]$SmtpPass,
  [string]$StripePublicKey,
  [string]$StripeSecretKey,
  [string]$PaypalClientId,
  [string]$PaypalClientSecret,
  [string]$PostgresUser = "snarcisse",
  [string]$PostgresPassword = "changeMe",
  [string]$PostgresDb = "snarcisse"
)

Write-Host "Configuring environment .env.production.local..."

if (-not $Domain) { $Domain = Read-Host "Enter your domain (e.g., sweet-narcisse.fr)" }
if (-not $EmailSender) { $EmailSender = Read-Host "Enter sender email (e.g., contact@$Domain)" }
if (-not $NextAuthSecret) { $NextAuthSecret = [Guid]::NewGuid().ToString("N") }
if (-not $ResendApiKey) { $ResendApiKey = Read-Host "Enter RESEND_API_KEY" }
if (-not $RecaptchaSecret) { $RecaptchaSecret = Read-Host "Enter RECAPTCHA_SECRET_KEY" }
if (-not $SmtpHost) { $SmtpHost = Read-Host "Enter SMTP host (e.g., ssl0.ovh.net)" }
if (-not $SmtpUser) { $SmtpUser = Read-Host "Enter SMTP username (full email)" }
if (-not $SmtpPass) { $SmtpPass = Read-Host "Enter SMTP password" }
if (-not $StripePublicKey) { $StripePublicKey = Read-Host "Enter STRIPE public key (pk_live_...)" }
if (-not $StripeSecretKey) { $StripeSecretKey = Read-Host "Enter STRIPE secret key (sk_live_...)" }
if (-not $PaypalClientId) { $PaypalClientId = Read-Host "Enter PAYPAL client id" }
if (-not $PaypalClientSecret) { $PaypalClientSecret = Read-Host "Enter PAYPAL client secret" }

$NextAuthUrl = "https://$Domain"

$content = @"
NEXTAUTH_URL=$NextAuthUrl
NEXTAUTH_SECRET=$NextAuthSecret

RESEND_API_KEY=$ResendApiKey
RECAPTCHA_SECRET_KEY=$RecaptchaSecret

VAT_RATE=20
ALERT_WEBHOOK_URL=

POSTGRES_USER=$PostgresUser
POSTGRES_PASSWORD=$PostgresPassword
POSTGRES_DB=$PostgresDb

DATABASE_URL=postgres://$PostgresUser:$PostgresPassword@localhost:5432/$PostgresDb
NEXT_PUBLIC_BASE_URL=$NextAuthUrl
EMAIL_SENDER=$EmailSender
SMTP_HOST=$SmtpHost
SMTP_PORT=$SmtpPort
SMTP_USER=$SmtpUser
SMTP_PASS=$SmtpPass
NEXT_PUBLIC_STRIPE_KEY=$StripePublicKey
STRIPE_SECRET_KEY=$StripeSecretKey
PAYPAL_CLIENT_ID=$PaypalClientId
PAYPAL_CLIENT_SECRET=$PaypalClientSecret
"@

$envPath = Join-Path $PSScriptRoot "..\.env.production.local"
Set-Content -Path $envPath -Value $content -Encoding UTF8
Write-Host "Written: $envPath"
