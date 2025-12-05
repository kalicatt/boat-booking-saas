-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_boatId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "boatId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
