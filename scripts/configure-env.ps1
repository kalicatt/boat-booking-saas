Param(
  [string]$Domain,
  [string]$EmailFromName = "Sweet Narcisse",
  [string]$EmailContact,
  [string]$EmailReservations,
  [string]$EmailBilling,
  [string]$EmailNotifications,
  [string]$EmailSender,
  [string]$AdminEmail,
  [string]$NextAuthSecret,
  [string]$ResendApiKey,
  [string]$RecaptchaSecret,
  [string]$SmtpHost,
  [int]$SmtpPort = 587,
  [string]$SmtpUser,
  [string]$SmtpPass,
  [string]$StripePublicKey,
  [string]$StripeSecretKey,
  [string]$StripeWebhookSecret,
  [string]$PaypalClientId,
  [string]$PaypalClientSecret,
  [string]$PaypalMode,
  [string]$RateLimitRedisUrl,
  [string]$RateLimitRedisToken,
  [string]$GenericAdminSeedPassword = "ChangeMe123!",
  [int]$PasswordMinScore = 3,
  [string]$GrafanaAdminUser = "admin",
  [string]$GrafanaAdminPassword = "admin",
  [string]$PostgresUser = "snarcisse",
  [string]$PostgresPassword = "changeMe",
  [string]$PostgresDb = "snarcisse"
)

Write-Host "Configuring environment .env.production.local..."

if (-not $Domain) { $Domain = Read-Host "Enter your domain (e.g., sweet-narcisse.fr)" }
if (-not $EmailFromName) { $EmailFromName = Read-Host "Display name for outgoing emails [Sweet Narcisse]"; if ([string]::IsNullOrWhiteSpace($EmailFromName)) { $EmailFromName = "Sweet Narcisse" } }
if (-not $EmailContact) { $EmailContact = Read-Host "Contact email [contact@$Domain]"; if ([string]::IsNullOrWhiteSpace($EmailContact)) { $EmailContact = "contact@$Domain" } }
if (-not $EmailReservations) { $EmailReservations = Read-Host "Reservations email [reservations@$Domain]"; if ([string]::IsNullOrWhiteSpace($EmailReservations)) { $EmailReservations = "reservations@$Domain" } }
if (-not $EmailBilling) { $EmailBilling = Read-Host "Billing email [facturation@$Domain]"; if ([string]::IsNullOrWhiteSpace($EmailBilling)) { $EmailBilling = "facturation@$Domain" } }
if (-not $EmailNotifications) { $EmailNotifications = Read-Host "Notifications email [operations@$Domain]"; if ([string]::IsNullOrWhiteSpace($EmailNotifications)) { $EmailNotifications = "operations@$Domain" } }
if (-not $AdminEmail) { $AdminEmail = Read-Host "Admin notification email (blank to reuse notifications)" }
if (-not $NextAuthSecret) { $NextAuthSecret = [Guid]::NewGuid().ToString("N") }
if (-not $ResendApiKey) { $ResendApiKey = Read-Host "Enter RESEND_API_KEY" }
if (-not $RecaptchaSecret) { $RecaptchaSecret = Read-Host "Enter RECAPTCHA_SECRET_KEY" }
if (-not $SmtpHost) { $SmtpHost = Read-Host "Enter SMTP host (e.g., ssl0.ovh.net)" }
if (-not $SmtpUser) { $SmtpUser = Read-Host "Enter SMTP username (full email)" }
if (-not $SmtpPass) { $SmtpPass = Read-Host "Enter SMTP password" }
if (-not $StripePublicKey) { $StripePublicKey = Read-Host "Enter STRIPE public key (pk_live_...)" }
if (-not $StripeSecretKey) { $StripeSecretKey = Read-Host "Enter STRIPE secret key (sk_live_...)" }
if (-not $StripeWebhookSecret) { $StripeWebhookSecret = Read-Host "Enter STRIPE webhook secret (whsec_...)" }
if (-not $PaypalClientId) { $PaypalClientId = Read-Host "Enter PAYPAL client id" }
if (-not $PaypalClientSecret) { $PaypalClientSecret = Read-Host "Enter PAYPAL client secret" }
if (-not $PaypalMode) { $PaypalMode = Read-Host "PayPal mode (live/sandbox)" }
if (-not $RateLimitRedisUrl) { $RateLimitRedisUrl = Read-Host "Redis REST URL (Upstash) [leave blank for in-memory]" }
if (-not $RateLimitRedisToken) { $RateLimitRedisToken = Read-Host "Redis REST token (Upstash) [leave blank for in-memory]" }
if ($GenericAdminSeedPassword -eq "ChangeMe123!" -and -not $PSBoundParameters.ContainsKey('GenericAdminSeedPassword')) {
  $GenericAdminSeedPassword = Read-Host "Generic admin seed password [ChangeMe123!]"
  if ([string]::IsNullOrWhiteSpace($GenericAdminSeedPassword)) { $GenericAdminSeedPassword = "ChangeMe123!" }
}
if (-not $PSBoundParameters.ContainsKey('PasswordMinScore')) {
  $PasswordMinScore = Read-Host "Password minimum score 0-4 [3]"
  if ([string]::IsNullOrWhiteSpace($PasswordMinScore)) {
    $PasswordMinScore = 3
  } else {
    $PasswordMinScore = [int]$PasswordMinScore
  }
}
if (-not $PSBoundParameters.ContainsKey('GrafanaAdminUser')) {
  $GrafanaAdminUser = Read-Host "Grafana admin user [admin]"
  if ([string]::IsNullOrWhiteSpace($GrafanaAdminUser)) { $GrafanaAdminUser = "admin" }
}
if (-not $PSBoundParameters.ContainsKey('GrafanaAdminPassword')) {
  $GrafanaAdminPassword = Read-Host "Grafana admin password [admin]"
  if ([string]::IsNullOrWhiteSpace($GrafanaAdminPassword)) { $GrafanaAdminPassword = "admin" }
}

if ([string]::IsNullOrWhiteSpace($AdminEmail)) { $AdminEmail = $EmailNotifications }
$EmailSender = $EmailNotifications

$NextAuthUrl = "https://$Domain"

$content = @"
NEXTAUTH_URL=$NextAuthUrl
NEXTAUTH_SECRET=$NextAuthSecret

RESEND_API_KEY=$ResendApiKey
RECAPTCHA_SECRET_KEY=$RecaptchaSecret

VAT_RATE=20
ALERT_WEBHOOK_URL=
RATE_LIMIT_REDIS_URL=$RateLimitRedisUrl
RATE_LIMIT_REDIS_TOKEN=$RateLimitRedisToken
PASSWORD_MIN_SCORE=$PasswordMinScore
GENERIC_ADMIN_SEED_PASSWORD=$GenericAdminSeedPassword
GRAFANA_ADMIN_USER=$GrafanaAdminUser
GRAFANA_ADMIN_PASSWORD=$GrafanaAdminPassword

POSTGRES_USER=$PostgresUser
POSTGRES_PASSWORD=$PostgresPassword
POSTGRES_DB=$PostgresDb

DATABASE_URL=postgres://${PostgresUser}:${PostgresPassword}@localhost:5432/${PostgresDb}
NEXT_PUBLIC_BASE_URL=$NextAuthUrl
EMAIL_SENDER=$EmailSender
ADMIN_EMAIL=$AdminEmail
EMAIL_FROM_NAME="$EmailFromName"
EMAIL_CONTACT=$EmailContact
EMAIL_RESERVATIONS=$EmailReservations
EMAIL_BILLING=$EmailBilling
EMAIL_NOTIFICATIONS=$EmailNotifications
SMTP_HOST=$SmtpHost
SMTP_PORT=$SmtpPort
SMTP_USER=$SmtpUser
SMTP_PASS=$SmtpPass
NEXT_PUBLIC_STRIPE_KEY=$StripePublicKey
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$StripePublicKey
STRIPE_SECRET_KEY=$StripeSecretKey
STRIPE_WEBHOOK_SECRET=$StripeWebhookSecret
PAYPAL_CLIENT_ID=$PaypalClientId
PAYPAL_CLIENT_SECRET=$PaypalClientSecret
PAYPAL_MODE=$PaypalMode
NEXT_PUBLIC_PAYPAL_CLIENT_ID=$PaypalClientId
"@

$envPath = Join-Path $PSScriptRoot "..\.env.production.local"
Set-Content -Path $envPath -Value $content -Encoding UTF8
Write-Host "Written: $envPath"
