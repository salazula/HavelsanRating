-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'LEAGUE_MANAGER', 'PLAYER');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'SUBMITTED', 'DISPUTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "ResultKind" AS ENUM ('NORMAL', 'BOTH_ABSENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "playerId" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "setAverage" INTEGER NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "schedule" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupEntry" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL DEFAULT 0,
    "ratingBefore" INTEGER NOT NULL,
    "setAvgBefore" INTEGER NOT NULL DEFAULT 0,
    "manualBonus" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "matchPoints" INTEGER,
    "bonus" INTEGER,
    "ratingAfter" INTEGER,
    "setAvgAfter" INTEGER,
    "played" INTEGER,
    "won" INTEGER,

    CONSTRAINT "GroupEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "kind" "ResultKind",
    "setsA" INTEGER,
    "setsB" INTEGER,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "disputeNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_roundId_code_key" ON "Group"("roundId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GroupEntry_groupId_playerId_key" ON "GroupEntry"("groupId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_groupId_playerAId_playerBId_key" ON "Match"("groupId", "playerAId", "playerBId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEntry" ADD CONSTRAINT "GroupEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEntry" ADD CONSTRAINT "GroupEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
