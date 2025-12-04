-- CreateIndex
CREATE INDEX "PaymentSession_targetDeviceId_idx" ON "PaymentSession"("targetDeviceId");

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
