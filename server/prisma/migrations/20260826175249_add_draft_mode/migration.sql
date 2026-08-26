-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "draftOrder" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "rollMode" TEXT NOT NULL DEFAULT 'standard';
