-- CreateEnum
CREATE TYPE "ShippingType" AS ENUM ('STORE_SHIP', 'STORE_WE_SHIP', 'WE_STORE_SHIP');

-- CreateEnum
CREATE TYPE "ShippingFee" AS ENUM ('FREE_DELIVERY', 'CHARGE_BUYER');

-- CreateEnum
CREATE TYPE "SellerShippingAddressType" AS ENUM ('PICKUP', 'RETURN');

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "shippingFee" "ShippingFee",
ADD COLUMN     "shippingType" "ShippingType";

-- CreateTable
CREATE TABLE "SellerShippingAddress" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "type" "SellerShippingAddressType" NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "SellerShippingAddress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SellerShippingAddress" ADD CONSTRAINT "SellerShippingAddress_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
