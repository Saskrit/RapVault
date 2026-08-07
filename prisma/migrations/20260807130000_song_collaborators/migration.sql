-- CreateTable
CREATE TABLE "SongCollaborator" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SongCollaborator_userId_idx" ON "SongCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SongCollaborator_songId_userId_key" ON "SongCollaborator"("songId", "userId");

-- AddForeignKey
ALTER TABLE "SongCollaborator" ADD CONSTRAINT "SongCollaborator_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongCollaborator" ADD CONSTRAINT "SongCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
