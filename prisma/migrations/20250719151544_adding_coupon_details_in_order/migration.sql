-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "couponDiscount" INTEGER NOT NULL DEFAULT 0;
