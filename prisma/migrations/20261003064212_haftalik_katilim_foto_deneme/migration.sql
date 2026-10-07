-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('PENDING', 'YES', 'NO', 'AUTO_NO');

-- AlterEnum
ALTER TYPE "RoundStatus" ADD VALUE 'ATTENDANCE';

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "playAt" TIMESTAMP(3),
ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "telegramError" TEXT,
ADD COLUMN     "telegramSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GroupEntry" ADD COLUMN     "attendance" "Attendance" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "attendanceAt" TIMESTAMP(3),
ADD COLUMN     "movedFrom" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weekStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GroupSlot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "place" TEXT,
    "size" INTEGER NOT NULL DEFAULT 6,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupSlot_code_key" ON "GroupSlot"("code");
