/*
  Warnings:

  - A unique constraint covering the columns `[slug,sellerId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,sellerId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "Category_slug_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sellerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_sellerId_key" ON "Category"("slug", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_sellerId_key" ON "Category"("name", "sellerId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
