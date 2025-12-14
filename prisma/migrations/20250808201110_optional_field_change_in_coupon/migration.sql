/*
  Warnings:

  - The `specificCustomerEmail` column on the `Coupon` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `startDate` on table `Coupon` required. This step will fail if there are existing NULL values in that column.
  - Made the column `validity` on table `Coupon` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "validity" SET NOT NULL,
DROP COLUMN "specificCustomerEmail",
ADD COLUMN     "specificCustomerEmail" TEXT[];
