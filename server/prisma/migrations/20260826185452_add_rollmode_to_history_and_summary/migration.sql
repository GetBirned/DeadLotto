-- AlterTable
ALTER TABLE "GameHistoryEntry" ADD COLUMN     "rollMode" TEXT NOT NULL DEFAULT 'standard';

-- AlterTable
ALTER TABLE "SharedGameSummary" ADD COLUMN     "rollMode" TEXT NOT NULL DEFAULT 'standard';
