-- AlterTable
ALTER TABLE "ChallengeSuggestion" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "GameHistoryEntry" ADD COLUMN     "lobbyId" TEXT;

-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "disabledHeroSlugs" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "discordWebhookUrl" TEXT,
ADD COLUMN     "rerollsAllowed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LobbyPlayer" ADD COLUMN     "rerollsUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "favoriteHeroSlug" TEXT,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileAccentColor" TEXT;

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementSlug" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementSlug_key" ON "UserAchievement"("userId", "achievementSlug");

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
