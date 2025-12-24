# Sweet Narcisse Production Deployment (Debian 25)

Practical checklist to prepare, configure, and operate the production stack on a fresh Debian 25 (or newer) VPS.

## 1. Server Preparation
- Log in as a sudo-enabled user on your Debian 25 VPS.
- Update base packages and install prerequisites:
	```bash
	sudo apt update
	sudo apt install -y ca-certificates curl gnupg git ufw
	```
- Install Docker Engine + Compose plugin (adapts to your codename automatically):
	```bash
	. /etc/os-release
	sudo install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $VERSION_CODENAME stable" | \
		sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
	sudo apt update
	sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
	sudo systemctl enable --now docker
	```
- Optional hardening:
	```bash
	sudo ufw allow OpenSSH
	sudo ufw allow 80/tcp
	sudo ufw allow 443/tcp
	sudo ufw enable
	```

## 2. Repository Layout
```bash
sudo mkdir -p /opt/sweetnarcisse
sudo chown $USER: /opt/sweetnarcisse
cd /opt/sweetnarcisse
git clone https://github.com/kalicatt/SweetNarcisse-demo.git .
```
Keep the repository under version control to simplify upgrades.

## 3. Configure Environment Variables (Automated Script)
Gather the required values before running the helper script:
- Domain name and DNS-ready mailboxes:
	- `contact@your-domain` → public contact forms + acknowledgements
	- `reservations@your-domain` → booking confirmations & cancellation links
	- `facturation@your-domain` → invoices and finance copies
	- `operations@your-domain` (or similar) → internal alerts (group/private requests, staff notifications)
- Friendly display name for outgoing emails (defaults to “Sweet Narcisse”)
- SMTP host/port/user/password
- Stripe publishable/secret/webhook keys
- PayPal REST client ID/secret for both **live** and **sandbox**
- Google reCAPTCHA secret key
- Redis URL/token if you enable Upstash rate limiting
- Grafana admin credentials (defaults are fine for first boot)

Generate `.env.production.local` directly on the VPS:
```bash
cd scripts
./configure-env.sh
cd ..
```
The script prompts for every value (including payment gateways) and writes `.env.production.local` at the repository root. Rerun it anytime you need to rotate secrets; review the output before restarting containers.

## 4. Persistent Database Stack
A dedicated Compose file keeps Postgres independent from application deploys and simplifies snapshots.
```bash
# One-time network creation
sudo docker network create sweetnarcisse-net || true

# Start (or restart) the database using the same env file
sudo docker compose -f docker-compose.db.yml --env-file .env.production.local up -d

# Confirm healthy
sudo docker compose -f docker-compose.db.yml ps
```
The database data lives in the named volume `sweetnarcisse-postgres` and persists between releases.

## 5. Build and Start the Application Stack
```bash
sudo docker compose --env-file .env.production.local pull
sudo docker compose --env-file .env.production.local up -d --build
```
The application service automatically reaches the database through the shared `sweetnarcisse-net` network.

## 6. TLS and Nginx Reverse Proxy
1. Edit `nginx/nginx.conf` and replace every `DOMAIN` placeholder with your FQDN.
2. Bring up the proxy + ACME helper:
	 ```bash
	 sudo docker compose --env-file .env.production.local up -d nginx certbot
	 ```
3. Issue certificates when DNS is ready:
	 ```bash
	 sudo docker compose run --rm certbot certonly \
		 --webroot -w /var/www/certbot \
		 -d your-domain.fr \
		 --email admin@your-domain.fr \
		 --agree-tos --no-eff-email
	 ```
4. Reload Nginx to pick up certificates:
	 ```bash
	 sudo docker compose exec nginx nginx -t
	 sudo docker compose exec nginx nginx -s reload
	 ```

## 7. Database Initialization (Prisma)
Run migrations and seed data once the containers are up:
```bash
sudo docker compose exec app npx prisma migrate deploy
sudo docker compose exec app npx prisma db seed || true
```

## 8. PayPal Sandbox Testing Workflow
1. In the PayPal dashboard, create (or locate) sandbox REST credentials.
2. Rerun `./scripts/configure-env.sh` (or manually edit `.env.production.local`) with:
	 - `PAYPAL_CLIENT_ID` set to the sandbox client ID
	 - `PAYPAL_CLIENT_SECRET` set to the sandbox secret
	 - `PAYPAL_MODE=sandbox`
3. Restart only the app container to apply the new values:
	 ```bash
	 sudo docker compose --env-file .env.production.local up -d app
	 ```
4. Perform your test bookings. When finished, restore live credentials and set `PAYPAL_MODE=live`, then restart the app container again.

## 9. Backups and Snapshots
- Logical dump:
	```bash
	sudo docker compose -f docker-compose.db.yml exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
	```
- Cold snapshot of the volume:
	```bash
	sudo docker compose -f docker-compose.db.yml stop db
	sudo docker run --rm \
		-v sweetnarcisse-postgres:/var/lib/postgresql/data \
		-v $(pwd):/backup \
		busybox tar czf /backup/postgres-$(date +%Y%m%d-%H%M).tgz /var/lib/postgresql/data
	sudo docker compose -f docker-compose.db.yml start db
	```
Automate these with cron or an external backup service.

## 10. Operations and Monitoring
- Application logs: `sudo docker compose logs -f app`
- Database logs: `sudo docker compose -f docker-compose.db.yml logs -f db`
- Prometheus/Alertmanager/Grafana services come up with `sudo docker compose up -d prometheus alertmanager grafana`; credentials are controlled via the env script.
- Configure `ALERT_WEBHOOK_URL` to forward monitoring alerts to your preferred channel (Teams, Slack, etc.).

## 11. Upgrades & Zero-Downtime Tips
1. Pull latest code: `git pull`
2. Regenerate `.env.production.local` if new variables were introduced.
3. Update images/build: `sudo docker compose pull` or `sudo docker compose build`
4. Apply migrations: `sudo docker compose exec app npx prisma migrate deploy`
5. Restart the app: `sudo docker compose up -d app`
6. Verify health endpoints (`/api/health`, booking flow, payments)
7. Rollback strategy: restore previous image + database snapshot.

## 12. Troubleshooting
- Prisma OpenSSL errors: ensure the Dockerfile keeps the Debian base image (already configured).
- Missing `RESEND_API_KEY`: some email routes degrade gracefully; set it for production.
- TypeScript auto-install notice: ensure `typescript` and `@types/node` remain in devDependencies when rebuilding locally.
- Network issues: confirm both stacks (`app` and `db`) share the `sweetnarcisse-net` bridge.

## 13. Mobile Packaging & Distribution
- **Préparer le bundle web :** `npm run build`
- **Synchroniser les projets natifs :** `npm run cap:sync` (production) ou `npm run cap:sync:dev` pour cibler le serveur LAN.
- **Android :**
	- `npx cap open android` puis configurer `app/build.gradle` (`versionCode`, `versionName`).
	- Lancer un build `Bundle` (AAB) pour Play Console ou `APK` pour diffusion interne.
	- Tester sur un device en mode Release.
- **iOS :**
	- `npx cap open ios`, mettre à jour `General > Version`/`Build`. Vérifier la team de signature.
	- Product → Archive → Distribuer via TestFlight ou Ad Hoc.
- **Vérifications avant envoi :**
	- Connexion à `https://sweet-narcisse.fr` (Splash + status bar).
	- Scan & Go, login remember-me, flux paiement (mode sandbox si besoin).
	- Billets emails/QR générés correctement.
- **Après publication :** tenir `DEPLOYMENT.md` à jour avec les numéros de version mobile et noter les builds distribués.

Deployment complete. Keep this checklist close for future releases and audits.
