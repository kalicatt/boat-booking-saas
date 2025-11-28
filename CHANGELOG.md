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

## Unreleased
- Pending changes will be listed here until the next tag.
