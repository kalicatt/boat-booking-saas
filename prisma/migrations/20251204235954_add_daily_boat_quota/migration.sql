-- CreateTable
CREATE TABLE "DailyBoatQuota" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "boatsAvailable" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyBoatQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyBoatQuota_day_key" ON "DailyBoatQuota"("day");
