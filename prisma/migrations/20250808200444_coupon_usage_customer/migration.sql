/*
  Warnings:

  - Made the column `sellerId` on table `Coupon` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_sellerId_fkey";

-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "sellerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CouponUsage" ADD COLUMN     "couponUsed" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
