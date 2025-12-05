# Sweet Narcisse – User Guide

Walkthrough for administrators, employees, and booking agents who run day-to-day operations. Pair this guide with the in-app tooltips and internal SOPs for finance/legal.

---

## 1. Getting Started

- **URL**: `https://sweet-narcisse.fr/admin` (or your staging hostname). Bookmark it.
- **Browsers**: Latest Chrome, Edge, Safari, or Firefox. Mobile Safari/Chrome supported for on-site tablets.
- **Login**: Use the email + password supplied by your lead. MFA is optional today; rotate passwords every quarter.
- **Password resets**: Click "Forgot password" on the login screen, or ask an admin with the `canManageStaff` permission to trigger a reset email.
- **Language**: Use the globe icon to switch locales. Dictionaries cover FR/EN/ES/DE/IT.

---

## 2. Dashboard Tour

- **Hero tiles**: Fleet availability, bookings today, pending tasks. Tiles hide automatically if your role lacks permission.
- **Weather block**: Real-time + 3h forecast. Red badge appears when wind exceeds `NEXT_PUBLIC_WIND_ALERT_THRESHOLD`.
- **Quick actions**: Shortcuts to new booking, refund search, contact forms, or manual payment capture (visible to privileged roles only).
- **Theme toggle**: Moon/Sun icon near the header switches between light/dark for night mode on the dock.
- **Alerts**: System notices (cron failures, webhook retries) appear at the top; click to view remediation tips.

---

## 3. Bookings

1. **Create**: Click "Nouvelle réservation"; pick date/time/boat, assign customer (existing or new), choose duration, add extras.
2. **Payments**:
	 - Default flow uses Stripe Payment Element (cards, Apple Pay, Google Pay). The modal guides you through capture.
	 - PayPal option appears as an alternate button; login with customer credentials and approve.
3. **Manual payments**: For cash or bank transfers, open the booking detail, use the "Ajouter un paiement manuel" form, and attach evidence if required.
4. **Pending holds**: Labeled as `PENDING`. If the payment stalls >30 min, the maintenance script cancels automatically; you can also force-cancel from the booking detail.
5. **Refund/cancel**: From the booking detail, choose "Annuler". The system handles Stripe refunds automatically; PayPal refunds require confirmation. Notes are sent via email to the guest.

---

## 4. Customers & Employees

- **Clients tab**: Search by email, phone, or booking ID. Edit contact details inline.
- **Promote client to employee** (new in v1.0.5):
	1. Open the "Employés" page and click "Ajouter".
	2. Enter the client's email. If a client account exists, the system reuses it, generates an employee number, and upgrades the role to `EMPLOYEE`.
	3. Set permissions (fleet access, finance, marketing) before saving.
	4. The promoted user receives an onboarding email prompting them to set a password if they did not have one.
- **Adjust permissions**: Toggle capabilities from the employee table; changes apply instantly.
- **Deactivate**: Switch the status toggle to disable login without deleting historical data.

---

## 5. Payments

- **Stripe**: Accepts cards + wallets. Declines show a reason code; ask the guest to try another method or call their bank.
- **PayPal**: Use for guests who prefer PayPal balance or PayPal Pay Later. Confirm capture status in the booking timeline.
- **Manual payment queue**: Flagged bookings appear in the dashboard tile if marked as "manual" but still unpaid. Resolve before end-of-day closing.
- **Receipts**: Email confirmations include payment breakdown and PDF invoices. Re-send from the booking detail if the guest lost them.

---

## 6. Maintenance & Fleet

- Dashboard alerts list boats needing charge, mechanical inspection, or flagged as unavailable.
- The overnight `daily-maintenance.ps1` script emails a digest to operations. If you miss the email, hit `Actions > Vérifier la flotte` to re-run the check in real time.
- Update boat status inside the fleet section after maintenance to clear alerts.

---

## 7. Reports & Alerts

- **Metrics page**: Shows daily revenue, conversion rate, weather correlation. Export CSV for accounting.
- **Weather + safety emails**: Subscribe under "Alerts" to receive SMS/email when wind or rain thresholds trigger.
- **Customer reviews**: The maintenance job rotates featured TripAdvisor IDs. You can override counts by setting `TRIPADVISOR_REVIEW_COUNT` before the next run.

---

## 8. Mobile & PWA

- **PWA install**: On Safari/Chrome mobile, tap share menu > "Add to Home Screen" for a fullscreen launcher.
- **Native builds**: Android/iOS apps mirror the web UI and support Bluetooth scanners for QR tickets. Sync happens via Capacitor; contact the dev team before distributing new binaries.
- **Offline mode**: Booking creation requires connectivity, but the app caches dictionaries and theme settings for basic navigation.

---

## 9. Support & Escalation

- **Product issues**: Contact the engineering lead (see `SECURITY.md`) or post in the #sweet-narcisse Slack channel.
- **Payment disputes**: Forward Stripe/PayPal emails to `facturation@...` and annotate the booking.
- **Infrastructure incidents**: Ping the on-call operator listed in the runbook; include screenshots and affected booking IDs.
