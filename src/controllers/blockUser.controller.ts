import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import prisma from "@/config/db.config";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";

const unblockCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: { email }
  });

  if (!existingCustomer) {
    throw new ApiError(404, "Customer not found");
  }

  // If already unblocked
  if (!existingCustomer.isBlocked) {
    res.status(200).json(new ApiResponse(200, {}, "Customer is already unblocked"));
  }

  await prisma.customer.update({
    where: { email },
    data: { isBlocked: false }
  });

  res.status(200).json(new ApiResponse(200, {}, "Customer unblocked successfully"));
});

const blockCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: { email }
  });

  if (!existingCustomer) {
    throw new ApiError(404, "Customer not found");
  }

  // If already blocked
  if (existingCustomer.isBlocked) {
    res.status(200).json(new ApiResponse(200, {}, "Customer is already blocked"));
  }

  await prisma.customer.update({
    where: { email },
    data: { isBlocked: true }
  });

  res.status(200).json(new ApiResponse(200, {}, "Customer blocked successfully"));
});

const unblockSeller = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const existingSeller = await prisma.seller.findUnique({
    where: { email }
  });

  if (!existingSeller) {
    throw new ApiError(404, "Seller not found");
  }

  // If already unblocked
  if (!existingSeller.isBlocked) {
    res.status(200).json(new ApiResponse(200, {}, "Seller is already unblocked"));
  }

  await prisma.seller.update({
    where: { email },
    data: { isBlocked: false }
  });

  res.status(200).json(new ApiResponse(200, {}, "Seller unblocked successfully"));
});

const blockSeller = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const existingSeller = await prisma.seller.findUnique({
    where: { email }
  });

  if (!existingSeller) {
    throw new ApiError(404, "Seller not found");
  }

  // If already blocked
  if (existingSeller.isBlocked) {
    res.status(200).json(new ApiResponse(200, {}, "Seller is already blocked"));
  }

  await prisma.seller.update({
    where: { email },
    data: { isBlocked: true }
  });

  res.status(200).json(new ApiResponse(200, {}, "Seller blocked successfully"));
});

export { unblockCustomer, unblockSeller, blockCustomer, blockSeller };
