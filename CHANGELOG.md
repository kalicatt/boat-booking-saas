# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and adheres to Semantic Versioning (MAJOR.MINOR.PATCH).

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

## Unreleased
- Pending changes will be listed here until the next tag.
