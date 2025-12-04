-- Track terminal device targeting and claims
ALTER TABLE "PaymentSession"
  ADD COLUMN "targetDeviceId" TEXT,
  ADD COLUMN "claimedByDeviceId" TEXT,
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "processingAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PaymentSession_targetDeviceId_idx" ON "PaymentSession" ("targetDeviceId");