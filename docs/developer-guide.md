# Sweet Narcisse – Developer Guide

Technical playbook for contributors and operators of the Sweet Narcisse platform. This guide complements `README.md` and focuses on day-to-day engineering work, release hygiene, and automation.

---

## 1. Architecture Overview

- **Frontend**: Next.js 16 App Router with React 19, Tailwind, and server components. UI lives in `app/`, shared building blocks in `components/`.
- **Backend**: API routes inside `app/api/*`, Prisma ORM for PostgreSQL, Redis (Upstash) for rate limits/cache, and cron-style scripts in `scripts/` and `prisma/`.
- **Payments**: Stripe Payment Element + webhooks plus PayPal REST SDK.
- **Auth**: NextAuth with Prisma adapter, role flags exposed through `types/adminPermissions.ts` and guards in `lib/adminAccess.ts`.
- **Ops Tooling**: Docker Compose stacks, Prometheus/Alertmanager/Grafana in `monitoring/`, and scheduled maintenance via `daily-maintenance.ps1`.

---

## 2. Local Development

1. **Install prerequisites**: Node 22+, npm 10+, Docker 24+ (optional but recommended for parity).
2. **Dependencies**:
	 ```bash
	 npm install --legacy-peer-deps
	 ```
3. **Environment**: copy `.env.example` to `.env.local` and fill database + API keys. For LAN HTTPS dev (required for wallet testing) run `pwsh scripts/setup-dev-https.ps1` and start with `npm run dev:https`.
4. **Database**: run migrations and seed data locally:
	 ```bash
	 npx prisma migrate dev
	 npx prisma db seed
	 ```
	 The seed now provisions default accounts as `EMPLOYEE`, so admin access must be granted manually through the UI or database when needed.
5. **Next.js dev server**:
	 ```bash
	 npm run dev            # turbopack
	 npm run dev:webpack    # fallback if turbopack misbehaves
	 ```
6. **Native shells**: `npm run cap:sync` to propagate web assets, `npm run cap:open:android|ios` to open platform projects.

Tips:
- Use `npm run lint` while coding; ESLint is strict and catches route-handler regressions early.
- When editing App Router server files, keep them async and return typed responses to satisfy Next.js 16 signatures.

---

## 3. Codebase Conventions

- **TypeScript first**: no implicit `any`. Add zod schemas for runtime validation when data crosses boundaries.
- **Folder layout**:
	- `app/` – routes, layouts, server actions.
	- `components/` – client/server components shared by multiple routes.
	- `lib/` – domain helpers (payments, booking logic, metrics, admin guards, email rendering).
	- `dictionaries/` – JSON translations consumed by the dictionary loader in `lib/get-dictionary.ts`.
- **Permissions**: declare feature gates in `types/adminPermissions.ts` then enforce via `ensureAdminPageAccess` or `hasPermission`. UI surfaces (e.g., `app/admin/page.tsx` and `app/admin/employees/ClientPage.tsx`) always check these helpers before rendering actions.
- **Styling**: Tailwind 3 + PostCSS. Prefer utility-first classes plus `clsx` helpers.
- **Imports**: The Tsconfig path alias `@/*` points to project root; avoid long relative paths.

---

## 4. Data + Integrations

- **Prisma**: schema lives in `prisma/schema.prisma`. Changes require `npx prisma migrate dev` locally and `npx prisma migrate deploy` in production.
- **Seed strategy**: `prisma/seed.ts` creates base fleet data and default staff accounts with `EMPLOYEE` roles. Promoting an existing client to employee is handled server-side via `POST /api/admin/employees` (see `app/api/admin/employees/route.ts`).
- **Stripe**:
	- Keys: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
	- Payment Element wrapper in `components/PaymentElementWrapper.tsx`.
	- Webhooks finalize booking and invoice state.
- **PayPal**: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, plus `PAYPAL_MODE` (live/sandbox). The admin UI exposes manual capture and fallback flows.
- **Email**: `lib/mailer.ts` chooses between Resend API (`RESEND_API_KEY`) and SMTP (filled via deployment script). React Email templates live in `components/emails/`.
- **Alerts & Metrics**: `lib/metrics.ts` exports Prometheus metrics, consumed by `/api/metrics`. Monitoring stack defined under `monitoring/`.

---

## 5. Testing & QA

| Check | Command | Notes |
|-------|---------|-------|
| Lint  | `npm run lint` | Runs ESLint 9 against TS/TSX. Required before commits.
| Unit  | `npm test` | Executes Vitest suite (headless, happy-path coverage for lib functions).
| Build | `npm run build` | Catch type/regression errors (Next.js + Prisma).

Manual QA checklist before tagging a release:
- Seed database (or run `npx prisma db seed`) and ensure employees/admin UI loads without runtime errors.
- Exercise booking flow end-to-end (Stripe + PayPal) in sandbox.
- Validate ability to promote a `CLIENT` to `EMPLOYEE` from `/admin/employees`.
- Trigger `daily-maintenance.ps1` locally to confirm fleet + review cron endpoints respond (use `.env` secrets or `FLEET_MAINTENANCE_KEY`).
- Smoke-test mobile shells via Capacitor if releasing native builds.

---

## 6. Release Workflow

1. Ensure `npm run lint`, `npm run test`, and `npm run build` all pass.
2. Update `CHANGELOG.md` (new section under `[Unreleased]`) and bump `package.json` with `npm run release` or manual edit.
3. Commit with `release: vX.Y.Z`, then tag `git tag vX.Y.Z`.
4. Push branch + tag.
5. Build Docker image: `docker build -t yourrepo/sweetnarcisse:X.Y.Z -t yourrepo/sweetnarcisse:latest .` and push/publish.
6. Deploy via Compose on the VPS (see `DEPLOYMENT.md`) and run `npx prisma migrate deploy` + `npx prisma db seed` once containers are up.
7. Update `RELEASE.md` if workflow steps change; keep `CHANGELOG.md` authoritative for features/bug fixes.

Rollback: stop container, rerun previous tagged image, and restore latest Postgres snapshot if schema changed.

---

## 7. Monitoring & Maintenance

- **daily-maintenance.ps1**: orchestrates database pruning, pending booking cleanup, Postgres dumps, featured review rotation, fleet status checks, and customer review reminder cron calls. Configure env vars:
	- `FLEET_STATUS_ENDPOINT` (defaults to localhost) and `FLEET_MAINTENANCE_KEY` to hit `/api/admin/fleet/check-status` securely.
	- `REVIEW_CRON_ENDPOINT` and `CRON_SECRET` for review requests.
	- `TRIPADVISOR_REVIEW_COUNT` to override dashboard aggregates.
- **Monitoring stack**: `docker compose up -d prometheus alertmanager grafana` starts the trio. `monitoring/alertmanager.yml` ships alert hooks; set `ALERT_WEBHOOK_URL` to forward incidents.
- **Logging**: `docker compose logs -f app` and `docker compose -f docker-compose.db.yml logs -f db` for container logs; Next.js also emits structured logs to stdout.

---

## 8. Troubleshooting

- **Prisma + OpenSSL**: Ensure Docker images stay on Debian/Ubuntu (Node 22 bookworm). Alpine-based images fail due to missing OpenSSL symbols.
- **Seed not applying**: Remember to run `npx prisma db seed` inside the running container after migrations, or delete the local sqlite cache during development if switching providers.
- **Stripe wallet blocked on LAN**: Use the HTTPS dev helper script + mkcert certificates and launch with `npm run dev:https`.
- **PayPal sandbox mode**: set `PAYPAL_MODE=sandbox` and restart only the app container to avoid touching the database.
- **Failed cron endpoints**: Ensure `FLEET_MAINTENANCE_KEY` / `CRON_SECRET` match between the script and server. The script logs warnings when HTTP calls fail; inspect server logs for stack traces.
