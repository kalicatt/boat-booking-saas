**SweetNarcisse Demo**

Production-ready Next.js app with booking, payments (Stripe + PayPal), Prisma, and Dockerized deployment for VPS. This README covers local setup, testing, building, Docker workflows, release/versioning, and troubleshooting.

## Prerequisites
- Node `>= 22`
- npm `>= 10`
- Docker `>= 24`
- OpenSSL-compatible base (Debian/Ubuntu recommended for Prisma)
- Optional: `git`, `stripe` account, PayPal account

## Quick Start (Local Dev)
- Install dependencies:
```bash
npm install --legacy-peer-deps
```
- Configure environment: copy `.env.example` to `.env.local` and fill values. See `DEPLOYMENT.md` for variable descriptions.
- Run dev server:
```bash
npm run dev
```
Open `http://localhost:3000`.

## Testing
- Unit tests (Vitest):
```bash
npm test
```

## Build (Production)
```bash
npm run build
npm run start
```
Notes:
- PostCSS/Tailwind plugin may be disabled in `next.config.ts` for compatibility; re-enable when your environment supports it.

## Docker (Local)
Build multi-stage image and run:
```bash
docker build -t sweetnarcisse:local .
docker run -p 3000:3000 --env-file .env.production --name sweetnarcisse sweetnarcisse:local
```
Save image to tar for transfer (do NOT commit tars):
```bash
docker save sweetnarcisse:local -o sweetnarcisse-image.tar
```

## Deployment (VPS)
Two options are documented in `DEPLOYMENT.md`:
- Registry: push/pull via Docker Hub or GHCR with versioned tags.
- Tar transfer: `scp` the saved tar and `docker load -i sweetnarcisse-image.tar`.

Reverse proxy, systemd service files, and TLS scripts are provided under `systemd/` and `scripts/`.

## Payments
- Stripe: Cards + Apple Pay + Google Pay via Payment Request. Webhook finalizes server state; `daily-maintenance.ps1` cleans stale pending bookings.
- PayPal: Standard button integration for alternative checkout.

Apple Pay domain association:
- Add domain in Stripe; download `apple-developer-merchantid-domain-association` and place at `public/.well-known/apple-developer-merchantid-domain-association`.

## Versioning & Releases
- Semantic versioning: `MAJOR.MINOR.PATCH` (e.g., `1.0.0`).
- Bump version and update changelog:
```bash
npm run release
```
- Tag the release and push:
```bash
git tag v1.0.0
git push origin v1.0.0
```
- Optional CI: build/push images only on tags.

## Repository Hygiene
- `.gitignore` includes `*.tar`; do not commit Docker image tar files.
- History was rewritten to remove large tar; force-push completed. If you previously cloned, re-clone or reset to `origin/master`.
- Consider branch protection on `master` to disallow force pushes and require PRs.

## Troubleshooting
- Prisma/OpenSSL errors in Alpine: use Debian/Ubuntu base or Node `bookworm` images.
- Missing `RESEND_API_KEY`: email routes are guarded; set the key or rely on Nodemailer fallback.
- Stripe API version literal: repository pins a tested version for type safety.
- Turbopack build complaints: ensure Next 16 route handler signatures match `NextRequest` and promise-based params.

## Docs
- `DEPLOYMENT.md`: VPS setup, registry vs tar, reverse proxy, TLS.
- `RELEASE.md`: Release workflow, pre-commit hook to block `*.tar`.
- `SECURITY.md`: Security practices and contact.

## License
Proprietary demo; redistribution restricted. Contact the owner for usage.

