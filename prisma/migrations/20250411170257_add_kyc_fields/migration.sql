-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "kycDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kycLink" TEXT;
