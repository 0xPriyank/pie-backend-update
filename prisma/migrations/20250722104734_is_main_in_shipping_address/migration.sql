/*
  Warnings:

  - Added the required column `isMain` to the `ShippingAddress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShippingAddress" ADD COLUMN     "isMain" BOOLEAN NOT NULL;
