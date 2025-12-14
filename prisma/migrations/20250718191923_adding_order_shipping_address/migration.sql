-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "shippingAddressId" TEXT;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "ShippingAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
