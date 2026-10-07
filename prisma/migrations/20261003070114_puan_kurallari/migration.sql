-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "rules" JSONB;

-- CreateTable
CREATE TABLE "RuleSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleSettings_pkey" PRIMARY KEY ("id")
);
