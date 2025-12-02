ALTER TABLE "Booking" ADD COLUMN "publicReference" TEXT;
CREATE UNIQUE INDEX "Booking_publicReference_key" ON "Booking"("publicReference");
