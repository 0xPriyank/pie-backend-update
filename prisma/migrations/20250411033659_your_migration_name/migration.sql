/*
  Warnings:

  - You are about to drop the column `shopImage` on the `Seller` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "shopImage",
ADD COLUMN     "brandOwner" BOOLEAN,
ADD COLUMN     "productCategories" TEXT,
ADD COLUMN     "taxImage" TEXT;
