/*
  Warnings:

  - You are about to drop the column `gstRate` on the `BankDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BankDetails" DROP COLUMN "gstRate";

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "gstRate" DOUBLE PRECISION;
