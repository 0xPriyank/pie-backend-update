/*
  Warnings:

  - You are about to drop the column `MaximumAmount` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `MinimumAmount` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `ProductApplicable` on the `Coupon` table. All the data in the column will be lost.
  - Added the required column `maximumAmount` to the `Coupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minimumAmount` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "MaximumAmount",
DROP COLUMN "MinimumAmount",
DROP COLUMN "ProductApplicable",
ADD COLUMN     "maximumAmount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "minimumAmount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "productApplicable" TEXT[];
