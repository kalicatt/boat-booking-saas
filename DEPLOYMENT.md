# Sweet Narcisse Production Deployment (Debian/OVH VPS)

> Checklist-driven, step-by-step guide to install, configure, operate, and upgrade.

## 1. Prerequisites
- Debian 12 VPS with sudo user.
- DNS A record for your domain pointing to VPS IP (e.g. `sweet-narcisse.fr`).
- SMTP credentials (OVH / Zimbra or other).
- Stripe account (Checkout enabled) + webhook secret.
- PayPal REST app (live + sandbox credentials).
- Postgres data volume (docker-managed).

## 2. System Packages
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
```

## 3. Clone Repository
```bash
sudo mkdir -p /opt/sweetnarcisse
sudo chown $USER: /opt/sweetnarcisse
git clone https://github.com/kalicatt/SweetNarcisse-demo.git /opt/sweetnarcisse
# Deployment

This document describes production deployment options for the Sweet Narcisse app, including a simple image transfer flow using Docker and an optional container registry workflow. It also covers environment variables and service management.

## Prerequisites
- A VPS or server with Docker installed and running.
- Ports open for HTTP/HTTPS (e.g., `3000` or via reverse proxy like Nginx).
- Environment variables set appropriately (see below).

## Build Locally and Transfer via Tar
This approach avoids registry setup and works well for quick deployments.

1) Build and save the image locally

```powershell
## 4. Generate Environment File
Option A (bash on Linux):
```bash
cd scripts
./configure-env.sh
```
Option B (Windows prep locally): run `configure-env.ps1` then upload `.env.production.local`.


2) Copy to VPS and load

```bash
Add Stripe webhook secret (if not prompted) by editing `.env.production.local` and appending:
```
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Ensure these exist:

3) Run the container on VPS

```bash
```
NEXTAUTH_URL=https://yourdomain
NEXT_PUBLIC_STRIPE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=live   # or sandbox
```

## 5. Configure Nginx Domain
Edit `nginx/nginx.conf` replacing all placeholder `DOMAIN` with your real domain. Example search/replace:
```bash
sed -i "s/DOMAIN/sweet-narcisse.fr/g" nginx/nginx.conf

## Using a Container Registry (Optional)
If you prefer pulling directly on the VPS:

```powershell
```

## 6. First Startup (HTTP Only + ACME Webroot)
```bash

```bash
docker compose pull
docker compose up -d
```
Verify site (HTTP): `curl -I http://yourdomain` → 200.

## Environment Variables
- `NODE_ENV`: should be `production`.
- `NEXT_TELEMETRY_DISABLED`: set to `1` to disable Next.js telemetry.
- `NEXTAUTH_SECRET`: required by NextAuth; use a strong secret.
- `AUTH_URL`: base URL for Auth.js (use your domain in prod, `http://localhost:3000` in dev).
- `AUTH_TRUST_HOST`: set to `true` to trust the host (required by Auth.js v5 when behind proxies or non-standard hosts).
- `EMAIL_SENDER`: default sender address for emails.
- `ADMIN_EMAIL`: admin notification address for contact forms.
- `RESEND_API_KEY`: set if you use Resend for emails. If not set, the app gracefully falls back or returns a configured error on specific routes.
- `RECAPTCHA_SECRET_KEY`: for server-side captcha verification.
- Any business-specific variables (see `config/business.json`).

## Notes on the Build
- The Dockerfile uses Node 22 (Debian bookworm) for compatibility with Prisma’s OpenSSL requirements and react-email packages.
- NPM postinstall scripts (e.g., Prisma generate) are ignored in the final runtime install step to avoid needing build-time binaries. Prisma client is generated during the builder stage.
- The container uses `next start` with the production build.

## Reverse Proxy (Optional)
If you use Nginx to terminate TLS and proxy to the app:

```nginx

## 7. Issue TLS Certificates
```bash
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d sweet-narcisse.fr --email contact@sweet-narcisse.fr --agree-tos --no-eff-email
```
Certificates appear under `./certbot/conf/live/yourdomain/`.
Uncomment / enable the HTTPS server block in `nginx.conf` if needed, then reload:
```bash
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

## 8. Database Initialization

## Systemd Service (Optional)
You can wrap `docker run` via a systemd unit or use Docker Compose if preferred. A sample unit file exists under `systemd/`.

## Troubleshooting
- If Prisma complains about OpenSSL on Alpine, use Debian-based images (already handled in Dockerfile).
- Missing `RESEND_API_KEY` now yields controlled behavior in contact routes; set the key to enable email sending.
- If Next.js tries to install TypeScript automatically, ensure `typescript` and `@types/node` are present in `devDependencies` locally or rely on the Docker multi-stage build where these are not needed at runtime.

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed || true
```

## 9. Stripe Webhook Setup
In Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://yourdomain/api/payments/stripe/webhook`
- Events: `checkout.session.completed`
Copy the signing secret → add to `.env.production.local` as `STRIPE_WEBHOOK_SECRET`.
Restart app:
```bash
docker compose restart app
```
Test: create a test/live Checkout session (according to your mode) and confirm booking marked paid.

## 10. PayPal Sandbox Mode (Optional)
Set `PAYPAL_MODE=sandbox` and use sandbox credentials. Restart app.
Return to `live` for production.

## 11. Systemd Integration
Move unit files:
```bash
sudo cp systemd/sweetnarcisse-app.service /etc/systemd/system/
sudo cp systemd/sweetnarcisse-certbot-renew.service /etc/systemd/system/
sudo cp systemd/sweetnarcisse-certbot-renew.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sweetnarcisse-app.service
sudo systemctl enable --now sweetnarcisse-certbot-renew.timer
```
App updates: run `sudo systemctl restart sweetnarcisse-app.service` after env/image changes.

## 12. Backups
Ad-hoc DB dump:
```bash
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```
Automate with cron or offsite sync (e.g. restic, borg).

## 13. Logs & Monitoring
App logs:
```bash
docker compose logs -f app
```
DB logs:
```bash
docker compose logs -f db
```
Add an external alert webhook URL to `ALERT_WEBHOOK_URL` for critical events.

## 14. Upgrades (Zero-ish Downtime)
1. Pull latest code: `git pull`.
2. Review diff & changelog.
3. Update env (new variables).
4. Build/pull images: `docker compose pull || docker compose build`.
5. Apply migrations:
```bash
docker compose run --rm app npx prisma migrate deploy
```
6. Restart stack:
```bash
sudo systemctl restart sweetnarcisse-app.service
```
7. Validate health: HTTP 200, payment test.

Rollback: restore previous commit + DB dump → redeploy.

## 15. Certificate Renewal
Timer runs daily; verify:
```bash
systemctl list-timers | grep certbot-renew
```
Manual trigger:
```bash
sudo systemctl start sweetnarcisse-certbot-renew.service
```

## 16. Security Hardening
- Keep system packages updated (`unattended-upgrades`).
- Enforce strong SMTP password; rotate secrets quarterly.
- Restrict SSH (fail2ban + key auth).
- Monitor Stripe / PayPal dashboards for anomalies.

## 17. Operational Smoke Test
After deployment:
```bash
curl -I https://yourdomain
docker compose exec app npx prisma db pull
docker compose exec app node -e "console.log('Stripe key ok:', !!process.env.STRIPE_SECRET_KEY)"
```
Confirm booking flow + email + payment capture.

## 18. Common Issues
- 403 on webhook: missing/incorrect `STRIPE_WEBHOOK_SECRET`.
- Emails not sent: check SMTP credentials / port (587 vs 465 TLS).
- PayPal sandbox failure: ensure `PAYPAL_MODE=sandbox` and sandbox keys.
- Nginx TLS errors: verify cert paths & permissions inside volume.

## 19. Next Improvements
- Add healthcheck container.
- Add metrics endpoint & Prometheus scraper.
- Implement log shipping (e.g. Loki or ELK).

---
Deployment complete. Refer back here for future upgrades.
