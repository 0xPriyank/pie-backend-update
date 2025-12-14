-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;
