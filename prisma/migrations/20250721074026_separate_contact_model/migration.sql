/*
  Warnings:

  - You are about to drop the column `contactId` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `contactId` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the `Contact` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_contactId_fkey";

-- DropForeignKey
ALTER TABLE "Seller" DROP CONSTRAINT "Seller_contactId_fkey";

-- DropIndex
DROP INDEX "Customer_contactId_key";

-- DropIndex
DROP INDEX "Seller_contactId_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "contactId";

-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "contactId";

-- DropTable
DROP TABLE "Contact";

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerContact" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "sellerId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,

    CONSTRAINT "SellerContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContact_number_key" ON "CustomerContact"("number");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContact_customerId_key" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerContact_number_key" ON "SellerContact"("number");

-- CreateIndex
CREATE UNIQUE INDEX "SellerContact_sellerId_key" ON "SellerContact"("sellerId");

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerContact" ADD CONSTRAINT "SellerContact_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
