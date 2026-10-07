-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "photoUrl" TEXT,
    "about" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "playerId" TEXT,
    "telegramError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Application_email_idx" ON "Application"("email");
