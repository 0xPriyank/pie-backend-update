-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "maxDiscountAmount" INTEGER,
ADD COLUMN     "minOrderValue" INTEGER,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usageLimit" INTEGER NOT NULL DEFAULT 9999;
