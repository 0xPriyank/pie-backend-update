/*
  Warnings:

  - A unique constraint covering the columns `[couponCode]` on the table `Coupon` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "startDate" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_couponCode_key" ON "Coupon"("couponCode");
