-- CreateEnum
CREATE TYPE "public"."GroupBuyStatus" AS ENUM ('ACTIVE', 'SUCCESS', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."GroupBuy" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "requiredParticipants" INTEGER NOT NULL,
    "currentParticipants" INTEGER NOT NULL DEFAULT 1,
    "discountPercentage" DECIMAL(65,30) NOT NULL,
    "status" "public"."GroupBuyStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupBuy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupBuyParticipant" (
    "id" TEXT NOT NULL,
    "groupBuyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBuyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupBuyParticipant_groupBuyId_userId_key" ON "public"."GroupBuyParticipant"("groupBuyId", "userId");

-- AddForeignKey
ALTER TABLE "public"."GroupBuy" ADD CONSTRAINT "GroupBuy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupBuy" ADD CONSTRAINT "GroupBuy_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupBuyParticipant" ADD CONSTRAINT "GroupBuyParticipant_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES "public"."GroupBuy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupBuyParticipant" ADD CONSTRAINT "GroupBuyParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
