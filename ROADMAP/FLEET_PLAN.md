# Fleet Module Scope

This plan translates `ROADMAP_MAINTENANCE` into actionable implementation steps for the new Fleet & Safety module.

## Data Model
- Extend `Boat` in `prisma/schema.prisma` with:
  - `batteryCycleDays Int @default(4)` to store the declared autonomy.
  - `lastChargeDate DateTime @default(now())` timestamp of last full charge.
  - `totalTrips Int @default(0)`, `tripsSinceService Int @default(0)`, `hoursSinceService Float @default(0.0)` counters for preventive maintenance.
- Create `MaintenanceLog` table with `id`, `boatId`, `type MaintenanceType`, optional `description`, `performedBy`, `cost`, and `createdAt`.
- Add `MaintenanceType` enum values `CHARGE`, `INSPECTION`, `REPAIR`, `CLEANING`.
- Migration name: `add_fleet_management`.

## Backend & Logic
- Update booking completion route (`app/api/admin/bookings/[id]/complete/route.ts`) to increment counters:
  - `totalTrips` and `tripsSinceService` by 1.
  - `hoursSinceService` by actual ride duration (fallback to planned duration when missing).
- Introduce helper in `lib/maintenance.ts` to compute battery alert level from `batteryCycleDays` and `lastChargeDate`.
- New API surface under `/api/admin/fleet`:
  - `GET /api/admin/fleet` returns boat list with computed alert levels and latest maintenance entries.
  - `POST /api/admin/fleet/charge` records a `CHARGE` log, resets `lastChargeDate`, and zeroes `tripsSinceService` when relevant.
  - `POST /api/admin/fleet/incident` creates `MaintenanceLog` entry, flips `Boat.status` to `MAINTENANCE`, and optionally stores `performedBy`/notes.
  - `POST /api/admin/fleet/check-status` (Phase 4) aggregates critical boats and triggers email + webhook for `daily-maintenance.ps1`.

## UI / Admin Pages
- Create `app/admin/fleet/page.tsx` client page using Konsta grid:
  - Header summary with counts: total boats, critical batteries, incidents open.
  - Cards per boat showing name, capacity, status, battery badge (🟢 J+1-2, 🟠 J+3, 🔴 J+4+), mechanics badge (warning when `tripsSinceService` > threshold or `status=MAINTENANCE`).
  - Inline log preview (last 2 entries) with type icon.
- Quick actions on each card:
  - `Marquer comme chargée` button calling `/api/admin/fleet/charge`.
  - `Signaler incident` button opening modal (textarea + severity) calling `/api/admin/fleet/incident`.

## Workflow Guardrails
- When creating/editing bookings, block assignment of boats flagged 🔴 (battery critical) or `status=MAINTENANCE`; show warning toast.
- Ensure the mark-as-charged flow is mobile-friendly (large button, haptic feedback on native shell).
- Log every action in `MaintenanceLog` for auditing.

## Automation
- Extend `daily-maintenance.ps1` with step "Vérification des Batteries" calling `/api/admin/fleet/check-status`.
- API route returns payload for email + console summary; script prints actionable list and fails on critical counts.

## Implementation Order
1. Apply Prisma migration (`add_fleet_management`).
2. Seed sample `MaintenanceLog` entries in `prisma/seed.ts` for demo data.
3. Implement backend helpers/routes and update booking completion logic.
4. Build fleet dashboard page and quick actions.
5. Wire scripting + notifications (Phase 4).
