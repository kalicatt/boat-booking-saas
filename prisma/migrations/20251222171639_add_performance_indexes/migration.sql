-- CreateIndex
CREATE INDEX "BlockedInterval_start_idx" ON "BlockedInterval"("start");

-- CreateIndex
CREATE INDEX "BlockedInterval_end_idx" ON "BlockedInterval"("end");

-- CreateIndex
CREATE INDEX "BlockedInterval_start_end_idx" ON "BlockedInterval"("start", "end");

-- CreateIndex
CREATE INDEX "Boat_status_idx" ON "Boat"("status");

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX "Booking_startTime_idx" ON "Booking"("startTime");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_boatId_idx" ON "Booking"("boatId");

-- CreateIndex
CREATE INDEX "Booking_status_date_idx" ON "Booking"("status", "date");

-- CreateIndex
CREATE INDEX "Booking_startTime_status_idx" ON "Booking"("startTime", "status");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX "WorkShift_userId_idx" ON "WorkShift"("userId");

-- CreateIndex
CREATE INDEX "WorkShift_startTime_idx" ON "WorkShift"("startTime");

-- CreateIndex
CREATE INDEX "WorkShift_userId_startTime_idx" ON "WorkShift"("userId", "startTime");
