-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('CHARGE', 'INSPECTION', 'REPAIR', 'CLEANING');

-- AlterTable
ALTER TABLE "Boat"
  ADD COLUMN     "batteryCycleDays" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN     "hoursSinceService" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN     "lastChargeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN     "totalTrips" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN     "tripsSinceService" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "boatId" INTEGER NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "cost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaintenanceLog"
  ADD CONSTRAINT "MaintenanceLog_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
