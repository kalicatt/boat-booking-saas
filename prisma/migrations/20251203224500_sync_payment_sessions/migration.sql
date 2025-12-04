-- Align PaymentSession table with current Prisma schema
ALTER TABLE "PaymentSession"
  ADD COLUMN IF NOT EXISTS "methodType" TEXT,
  ADD COLUMN IF NOT EXISTS "targetDeviceId" TEXT,
  ADD COLUMN IF NOT EXISTS "intentId" TEXT,
  ADD COLUMN IF NOT EXISTS "intentClientSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;

ALTER TABLE "PaymentSession"
  DROP COLUMN IF EXISTS "failureReason";

ALTER TABLE "PaymentSession"
  ALTER COLUMN "provider" SET DEFAULT 'stripe_terminal';

UPDATE "PaymentSession"
SET "expiresAt" = NOW()
WHERE "expiresAt" IS NULL;

ALTER TABLE "PaymentSession"
  ALTER COLUMN "expiresAt" SET NOT NULL;

DROP INDEX IF EXISTS "PaymentSession_status_idx";
DROP INDEX IF EXISTS "PaymentSession_expiresAt_idx";
CREATE INDEX IF NOT EXISTS "PaymentSession_status_expiresAt_idx" ON "PaymentSession" ("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "PaymentSession_targetDeviceId_status_idx" ON "PaymentSession" ("targetDeviceId", "status");

DROP INDEX IF EXISTS "Payment_paymentSessionId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_paymentSessionId_key" ON "Payment" ("paymentSessionId");
