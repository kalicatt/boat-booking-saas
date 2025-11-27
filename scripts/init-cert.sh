#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${1:-}
EMAIL=${2:-admin@${DOMAIN}}
if [ -z "$DOMAIN" ]; then
  echo "Usage: scripts/init-cert.sh <domain> [email]"; exit 1
fi

echo "Starting nginx and app for ACME challenge..."
docker compose --env-file .env.production.local up -d nginx app

echo "Requesting certificate for ${DOMAIN}"
docker run --rm \
  -v sweetnarcisse-demo_certbot_www:/var/www/certbot \
  -v sweetnarcisse-demo_certbot_etc:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/certbot -d "${DOMAIN}" --email "${EMAIL}" --agree-tos --non-interactive

echo "Certificate requested. Update nginx/nginx.conf to point to /etc/letsencrypt/live/${DOMAIN}/fullchain.pem and privkey.pem, then reload nginx."
