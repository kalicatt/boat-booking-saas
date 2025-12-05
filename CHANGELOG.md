# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and adheres to Semantic Versioning (MAJOR.MINOR.PATCH).

## [Unreleased]
- Pending changes will be listed here until the next tag.

---

## [1.0.5] - 2025-12-05
### Added
- Ability to promote an existing `CLIENT` to `EMPLOYEE` directly from `/api/admin/employees` and the Admin UI, including automatic employee number generation and audit logs.
- Dedicated developer and user guides under `docs/` to capture architecture details, SOPs, and staff workflows.

### Changed
- Prisma seed now provisions default staff accounts with the safer `EMPLOYEE` role instead of `ADMIN`.
- Admin dashboard tiles and quick actions respect the refined permission matrix, preventing unauthorized widgets when ACLs change.

### Fixed
- Employees page table rendering, permission toggles, and booking email apostrophes that previously broke ESLint/TS builds.
- TypeScript definitions for admin permissions and the POST employees handler, restoring clean `npm run lint` / `npm run build` runs.

### Documentation
- `README.md`, `RELEASE.md`, and deployment instructions now link to the new guides and describe the maintenance script expectations.

### Credits
- Release owner: Lucas Servais.

---

## [1.0.4] - 2025-12-02
### Added
- `scripts/harden-vps.sh` to automate SSH hardening, firewall rules, and fail2ban setup on fresh servers.

### Changed
- Native splash screen, status bar, and launcher icons refreshed to align with the Sweet Narcisse branding.
- Capacitor configuration and environment defaults now target `https://sweet-narcisse.fr` with updated Android version metadata (`versionCode 100`, `versionName "Alpha Sweet-Narcisse"`).

### Documentation
- `README.md`, `DEPLOYMENT.md`, and `RELEASE.md` updated with the 1.0.4 workflow, VPS hardening guidance, and new release tagging steps.

### Credits
- Release owner: Lucas Servais.

---

## [1.0.3] - 2025-11-29
### Changed
- Booking creation now normalizes inherited payment metadata and applies the `shouldMarkPaid` guard consistently across chained reservations.
- Booking widget, contact forms, and payment components consume typed dictionaries to remove implicit `any` usage in client flows.

### Fixed
- PayPal capture and Stripe webhook handlers align with SDK typings and improved logging, clearing build blockers.
- Admin stats aggregation filters by Prisma `BookingStatus`, restoring API stability and successful Next.js builds.

### Documentation
- Release and Docker workflows updated for version `1.0.3`.

### Credits
- Release owner: Lucas Servais.

---

## [1.0.2] - 2025-11-29
### Added
- Flag icons displayed in the mobile/off-canvas language selector to make locale choices clear at a glance.

### Changed
- Centralised language metadata (labels, flags) to keep navigation and future locales consistent.

---

## [1.0.1] - 2025-11-28
### Changed
- Tailwind CSS stabilized (downgrade to v3, classic directives) to restore full styling in dev.
- PostCSS configuration migrated to CJS with explicit tailwindcss + autoprefixer plugins.

### Fixed
- Dynamic route `[lang]` updated to await `params` (Next.js 16 Promise-based params) preventing runtime error.
- Removed missing partner logo images causing layout 404s and instability.
- Eliminated duplicate global CSS import in nested layout.
- Disabled then re-enabled Turbopack with fallback script for future debugging.

### Added
- `tailwind.config.cjs` with content globs and extended theme tokens.
- Fallback `dev:webpack` script for development stability.

### Removed
- Temporary debug Tailwind badge from global styles.

---

## [1.0.0] - 2025-11-28
- Initial production-ready build.
- Docker multi-stage build (Node 22 bookworm) with Prisma compatibility.
- Email routes guarded when `RESEND_API_KEY` is missing.
- Vitest configuration with `@` alias resolution.
- Stripe webhook route updated to current API version literal.

### Added
- Deployment guide with tar-transfer and registry workflows.
- Systemd unit examples and Nginx reverse proxy notes.

### Fixed
- Build issues with route handler signatures and React email rendering.

### Security
- Notes on TLS, secret management, and Prisma/OpenSSL compatibility.

---
