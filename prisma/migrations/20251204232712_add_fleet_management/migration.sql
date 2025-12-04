-- DropForeignKey
ALTER TABLE "PaymentSession" DROP CONSTRAINT "PaymentSession_createdById_fkey";

-- DropIndex
DROP INDEX "PaymentSession_targetDeviceId_idx";

-- AlterTable
ALTER TABLE "PaymentSession" ALTER COLUMN "updatedAt" DROP DEFAULT;
