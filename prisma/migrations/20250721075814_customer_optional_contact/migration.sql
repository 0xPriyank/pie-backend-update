-- DropForeignKey
ALTER TABLE "CustomerContact" DROP CONSTRAINT "CustomerContact_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SellerContact" DROP CONSTRAINT "SellerContact_sellerId_fkey";

-- AlterTable
ALTER TABLE "CustomerContact" ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SellerContact" ALTER COLUMN "sellerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerContact" ADD CONSTRAINT "SellerContact_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
