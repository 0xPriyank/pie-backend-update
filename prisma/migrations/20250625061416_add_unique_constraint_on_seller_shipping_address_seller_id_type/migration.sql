/*
  Warnings:

  - A unique constraint covering the columns `[sellerId,type]` on the table `SellerShippingAddress` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SellerShippingAddress_sellerId_type_key" ON "SellerShippingAddress"("sellerId", "type");
