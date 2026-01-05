-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "compareAtPrice" INTEGER,
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "trackQuantity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weight" DOUBLE PRECISION;
