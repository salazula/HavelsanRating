-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "isPilot" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPilot" BOOLEAN NOT NULL DEFAULT false;
