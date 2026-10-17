-- AlterTable
ALTER TABLE "Song" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Song_userId_deletedAt_idx" ON "Song"("userId", "deletedAt");
