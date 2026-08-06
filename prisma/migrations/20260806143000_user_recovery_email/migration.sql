-- AlterTable
ALTER TABLE "User" ADD COLUMN "recoveryEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_recoveryEmail_key" ON "User"("recoveryEmail");
