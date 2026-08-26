-- AlterTable
ALTER TABLE "GameHistoryEntry" ADD COLUMN     "assists" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LobbyPlayer" ADD COLUMN     "assists" INTEGER;

-- AlterTable
ALTER TABLE "SharedGameSummaryPlayer" ADD COLUMN     "assists" INTEGER NOT NULL DEFAULT 0;
