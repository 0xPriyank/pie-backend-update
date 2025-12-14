/*
  Warnings:

  - The `productCategories` column on the `Seller` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "productCategories",
ADD COLUMN     "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
