-- CreateEnum
CREATE TYPE "EmployeeDocumentAction" AS ENUM ('UPLOAD_REQUEST', 'CONFIRM', 'DOWNLOAD', 'PREVIEW', 'ARCHIVE', 'DELETE');

-- CreateTable
CREATE TABLE "EmployeeDocumentLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "actorId" TEXT,
    "action" "EmployeeDocumentAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocumentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeDocumentLog_documentId_idx" ON "EmployeeDocumentLog"("documentId");

-- CreateIndex
CREATE INDEX "EmployeeDocumentLog_actorId_idx" ON "EmployeeDocumentLog"("actorId");

-- CreateIndex
CREATE INDEX "EmployeeDocumentLog_targetUserId_idx" ON "EmployeeDocumentLog"("targetUserId");

-- AddForeignKey
ALTER TABLE "EmployeeDocumentLog" ADD CONSTRAINT "EmployeeDocumentLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
