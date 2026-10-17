-- AlterTable
ALTER TABLE "SongCollaborator" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'accepted';
ALTER TABLE "SongCollaborator" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "SongCollaborator_songId_status_idx" ON "SongCollaborator"("songId", "status");

-- CreateIndex
CREATE INDEX "SongCollaborator_userId_status_idx" ON "SongCollaborator"("userId", "status");
