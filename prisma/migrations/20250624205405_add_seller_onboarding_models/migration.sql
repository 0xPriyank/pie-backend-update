/*
  Warnings:

  - The values [FREE_DELIVERY,CHARGE_BUYER] on the enum `ShippingFee` will be removed. If these variants are still used in the database, this will fail.
  - The values [STORE_SHIP,STORE_WE_SHIP,WE_STORE_SHIP] on the enum `ShippingType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `accountHolderName` on the `BankDetails` table. All the data in the column will be lost.
  - You are about to drop the column `documentUrl` on the `BankDetails` table. All the data in the column will be lost.
  - You are about to drop the column `brandOwner` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `gstRate` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `kycDone` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `kycLink` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `productCategories` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `shopDescription` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `shopImage` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `shopName` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `taxId` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `taxImage` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `SellerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `SellerShippingAddress` table. All the data in the column will be lost.
  - You are about to drop the column `street` on the `SellerShippingAddress` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `ShippingAddress` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[documentFileId]` on the table `BankDetails` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountName` to the `BankDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pincode` to the `SellerAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressLine1` to the `SellerShippingAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pincode` to the `SellerShippingAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pincode` to the `ShippingAddress` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "KYCDocumentType" AS ENUM ('pan', 'aadhar', 'driving_license', 'voter_id');

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingFee_new" AS ENUM ('free', 'paid');
ALTER TABLE "Seller" ALTER COLUMN "shippingFee" TYPE "ShippingFee_new" USING ("shippingFee"::text::"ShippingFee_new");
ALTER TYPE "ShippingFee" RENAME TO "ShippingFee_old";
ALTER TYPE "ShippingFee_new" RENAME TO "ShippingFee";
DROP TYPE "ShippingFee_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingType_new" AS ENUM ('self', 'shiprocket');
ALTER TABLE "Seller" ALTER COLUMN "shippingType" TYPE "ShippingType_new" USING ("shippingType"::text::"ShippingType_new");
ALTER TYPE "ShippingType" RENAME TO "ShippingType_old";
ALTER TYPE "ShippingType_new" RENAME TO "ShippingType";
DROP TYPE "ShippingType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_productId_fkey";

-- DropIndex
DROP INDEX "Seller_taxId_key";

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "BankDetails" DROP COLUMN "accountHolderName",
DROP COLUMN "documentUrl",
ADD COLUMN     "accountName" TEXT NOT NULL,
ADD COLUMN     "documentFileId" TEXT;

-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "resetExpires" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "brandOwner",
DROP COLUMN "gstRate",
DROP COLUMN "kycDone",
DROP COLUMN "kycLink",
DROP COLUMN "productCategories",
DROP COLUMN "shopDescription",
DROP COLUMN "shopImage",
DROP COLUMN "shopName",
DROP COLUMN "taxId",
DROP COLUMN "taxImage",
ADD COLUMN     "country" TEXT,
ADD COLUMN     "legalAgreementDate" TIMESTAMP(3),
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "onboardingComplete" BOOLEAN DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "tcsCompliance" BOOLEAN,
ADD COLUMN     "termsOfService" BOOLEAN;

-- AlterTable
ALTER TABLE "SellerAddress" DROP COLUMN "postalCode",
ADD COLUMN     "pincode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SellerShippingAddress" DROP COLUMN "postalCode",
DROP COLUMN "street",
ADD COLUMN     "addressLine1" TEXT NOT NULL,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "pincode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ShippingAddress" DROP COLUMN "postalCode",
ADD COLUMN     "pincode" TEXT NOT NULL;

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "Image";

-- CreateTable
CREATE TABLE "StorefrontInfo" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "storeName" TEXT,
    "storeDescription" TEXT,
    "storeLocation" TEXT,
    "isBrandOwner" BOOLEAN NOT NULL,
    "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "storeLogoId" TEXT,
    "shopImageId" TEXT,

    CONSTRAINT "StorefrontInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GSTInfo" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "gstin" TEXT,
    "withoutGst" BOOLEAN,
    "exemptionReason" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstCertificateFileId" TEXT,
    "panCardFileId" TEXT,

    CONSTRAINT "GSTInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KYCInfo" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "kycDone" BOOLEAN NOT NULL DEFAULT false,
    "kycLink" TEXT,
    "kycDocumentType" "KYCDocumentType",
    "kycDocumentId" TEXT,
    "kycSelfieId" TEXT,

    CONSTRAINT "KYCInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerOnboardingProgress" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "progressStep" TEXT[],
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerOnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT,
    "src" TEXT,
    "mimeType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "alt" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "sellerId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontInfo_sellerId_key" ON "StorefrontInfo"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontInfo_storeLogoId_key" ON "StorefrontInfo"("storeLogoId");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontInfo_shopImageId_key" ON "StorefrontInfo"("shopImageId");

-- CreateIndex
CREATE UNIQUE INDEX "GSTInfo_sellerId_key" ON "GSTInfo"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "GSTInfo_gstCertificateFileId_key" ON "GSTInfo"("gstCertificateFileId");

-- CreateIndex
CREATE UNIQUE INDEX "GSTInfo_panCardFileId_key" ON "GSTInfo"("panCardFileId");

-- CreateIndex
CREATE UNIQUE INDEX "KYCInfo_sellerId_key" ON "KYCInfo"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "KYCInfo_kycDocumentId_key" ON "KYCInfo"("kycDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "KYCInfo_kycSelfieId_key" ON "KYCInfo"("kycSelfieId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerOnboardingProgress_sellerId_key" ON "SellerOnboardingProgress"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_documentFileId_key" ON "BankDetails"("documentFileId");

-- AddForeignKey
ALTER TABLE "StorefrontInfo" ADD CONSTRAINT "StorefrontInfo_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontInfo" ADD CONSTRAINT "StorefrontInfo_storeLogoId_fkey" FOREIGN KEY ("storeLogoId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontInfo" ADD CONSTRAINT "StorefrontInfo_shopImageId_fkey" FOREIGN KEY ("shopImageId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTInfo" ADD CONSTRAINT "GSTInfo_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTInfo" ADD CONSTRAINT "GSTInfo_gstCertificateFileId_fkey" FOREIGN KEY ("gstCertificateFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GSTInfo" ADD CONSTRAINT "GSTInfo_panCardFileId_fkey" FOREIGN KEY ("panCardFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCInfo" ADD CONSTRAINT "KYCInfo_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCInfo" ADD CONSTRAINT "KYCInfo_kycDocumentId_fkey" FOREIGN KEY ("kycDocumentId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCInfo" ADD CONSTRAINT "KYCInfo_kycSelfieId_fkey" FOREIGN KEY ("kycSelfieId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_documentFileId_fkey" FOREIGN KEY ("documentFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOnboardingProgress" ADD CONSTRAINT "SellerOnboardingProgress_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
