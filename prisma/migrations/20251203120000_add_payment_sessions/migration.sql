-- Create payment session core structures
CREATE TYPE "PaymentSessionStatus" AS ENUM ('PENDING', 'CLAIMED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'stripe_terminal',
    "status" "PaymentSessionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "expiresAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentSession_bookingId_idx" ON "PaymentSession" ("bookingId");
CREATE INDEX "PaymentSession_status_idx" ON "PaymentSession" ("status");

ALTER TABLE "Payment" ADD COLUMN     "paymentSessionId" TEXT;
CREATE INDEX "Payment_paymentSessionId_idx" ON "Payment" ("paymentSessionId");

ALTER TABLE "PaymentSession"
  ADD CONSTRAINT "PaymentSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;