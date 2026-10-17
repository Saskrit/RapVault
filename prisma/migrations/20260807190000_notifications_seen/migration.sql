-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationsSeenAt" TIMESTAMP(3);
