/*
  Warnings:

  - The values [aadhar] on the enum `KYCDocumentType` will be removed. If these variants are still used in the database, this will fail.
  - The values [self,shiprocket] on the enum `ShippingType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "KYCDocumentType_new" AS ENUM ('pan', 'aadhaar', 'driving_license', 'voter_id');
ALTER TABLE "KYCInfo" ALTER COLUMN "kycDocumentType" TYPE "KYCDocumentType_new" USING ("kycDocumentType"::text::"KYCDocumentType_new");
ALTER TYPE "KYCDocumentType" RENAME TO "KYCDocumentType_old";
ALTER TYPE "KYCDocumentType_new" RENAME TO "KYCDocumentType";
DROP TYPE "KYCDocumentType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingType_new" AS ENUM ('SELF_FULFILLED', 'PLATFORM_COURIER');
ALTER TABLE "Seller" ALTER COLUMN "shippingType" TYPE "ShippingType_new" USING ("shippingType"::text::"ShippingType_new");
ALTER TYPE "ShippingType" RENAME TO "ShippingType_old";
ALTER TYPE "ShippingType_new" RENAME TO "ShippingType";
DROP TYPE "ShippingType_old";
COMMIT;
