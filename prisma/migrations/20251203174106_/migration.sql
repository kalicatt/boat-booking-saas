-- Enrich sessions with author and metadata
ALTER TABLE "PaymentSession"
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "createdById" TEXT;

ALTER TABLE "PaymentSession"
  ADD CONSTRAINT "PaymentSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;