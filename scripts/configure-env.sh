#!/usr/bin/env bash
set -euo pipefail

read -p "Domain (e.g., sweet-narcisse.fr): " DOMAIN
read -p "Sender email (e.g., contact@${DOMAIN}): " EMAIL_SENDER
read -p "NEXTAUTH_SECRET (auto if blank): " NEXTAUTH_SECRET
read -p "RESEND_API_KEY (blank to use SMTP): " RESEND_API_KEY
read -p "RECAPTCHA_SECRET_KEY: " RECAPTCHA_SECRET
read -p "SMTP host (e.g., ssl0.ovh.net): " SMTP_HOST
read -p "SMTP port (587 or 465): " SMTP_PORT
read -p "SMTP username (full email): " SMTP_USER
read -p "SMTP password: " SMTP_PASS
read -p "Postgres user [snarcisse]: " POSTGRES_USER
POSTGRES_USER=${POSTGRES_USER:-snarcisse}
read -p "Postgres password [changeMe]: " POSTGRES_PASSWORD
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeMe}
read -p "Postgres DB [snarcisse]: " POSTGRES_DB
POSTGRES_DB=${POSTGRES_DB:-snarcisse}
read -p "Stripe public key (pk_live_...): " STRIPE_PUBLIC_KEY
read -p "Stripe secret key (sk_live_...): " STRIPE_SECRET_KEY
read -p "PayPal client id: " PAYPAL_CLIENT_ID
read -p "PayPal client secret: " PAYPAL_CLIENT_SECRET
read -p "PayPal mode (live/sandbox) [live]: " PAYPAL_MODE
PAYPAL_MODE=${PAYPAL_MODE:-live}

if [ -z "${NEXTAUTH_SECRET}" ]; then
  NEXTAUTH_SECRET=$(openssl rand -hex 32)
fi
NEXTAUTH_URL="https://${DOMAIN}"

cat > .env.production.local <<EOF
NEXTAUTH_URL=${NEXTAUTH_URL}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

RESEND_API_KEY=${RESEND_API_KEY}
RECAPTCHA_SECRET_KEY=${RECAPTCHA_SECRET}

VAT_RATE=20
ALERT_WEBHOOK_URL=

POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}

DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}
NEXT_PUBLIC_BASE_URL=${NEXTAUTH_URL}
EMAIL_SENDER=${EMAIL_SENDER}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
NEXT_PUBLIC_STRIPE_KEY=${STRIPE_PUBLIC_KEY}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID}
PAYPAL_CLIENT_SECRET=${PAYPAL_CLIENT_SECRET}
PAYPAL_MODE=${PAYPAL_MODE}
EOF

echo "Written .env.production.local"
