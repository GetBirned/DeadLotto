-- CreateTable
CREATE TABLE "SharedGameSummary" (
    "id" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedGameSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedGameSummaryPlayer" (
    "id" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "heroSlug" TEXT,
    "challengeNames" TEXT NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "souls" INTEGER NOT NULL,
    "sessionWins" INTEGER NOT NULL,
    "sessionLosses" INTEGER NOT NULL,

    CONSTRAINT "SharedGameSummaryPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedGameSummary_shareCode_key" ON "SharedGameSummary"("shareCode");

-- AddForeignKey
ALTER TABLE "SharedGameSummaryPlayer" ADD CONSTRAINT "SharedGameSummaryPlayer_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "SharedGameSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
