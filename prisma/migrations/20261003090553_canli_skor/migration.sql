-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "liveById" TEXT,
ADD COLUMN     "liveFirstServer" TEXT,
ADD COLUMN     "livePoints" JSONB,
ADD COLUMN     "liveStartedAt" TIMESTAMP(3),
ADD COLUMN     "liveUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "liveVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "setScores" JSONB;
