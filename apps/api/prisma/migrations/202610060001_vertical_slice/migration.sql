-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('PROVINCIA', 'CIUDAD', 'LOCALIDAD', 'BARRIO', 'ZONA');

-- CreateEnum
CREATE TYPE "FootballType" AS ENUM ('FIVE', 'SIX', 'SEVEN');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationRole" AS ENUM ('ORGANIZER', 'PLAYER');

-- CreateEnum
CREATE TYPE "EmailTokenKind" AS ENUM ('VERIFY', 'RESET');

-- CreateTable
CREATE TABLE "Location" (
    "id" UUID NOT NULL,
    "seedKey" TEXT,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "parentId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "primaryLocationId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedRefreshToken" (
    "hash" TEXT NOT NULL,
    "sessionId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UsedRefreshToken_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "hash" TEXT NOT NULL,
    "kind" "EmailTokenKind" NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "seedKey" TEXT,
    "organizerId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "footballType" "FootballType" NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pricePerPerson" DECIMAL(10,2) NOT NULL,
    "availablePlaces" INTEGER NOT NULL,
    "description" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "role" "ParticipationRole" NOT NULL,
    "localDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_seedKey_key" ON "Location"("seedKey");

-- CreateIndex
CREATE INDEX "Location_active_name_idx" ON "Location"("active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshHash_key" ON "Session"("refreshHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "UsedRefreshToken_expiresAt_idx" ON "UsedRefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_hash_key" ON "EmailToken"("hash");

-- CreateIndex
CREATE INDEX "EmailToken_userId_kind_idx" ON "EmailToken"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Match_seedKey_key" ON "Match"("seedKey");

-- CreateIndex
CREATE INDEX "Match_locationId_startsAt_id_idx" ON "Match"("locationId", "startsAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_userId_matchId_key" ON "Participation"("userId", "matchId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
