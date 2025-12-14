import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import {
  getSellerReturns,
  getReturnById,
  updateReturnStatus
} from "@/services/return.service";
import {
  processRefund,
  updateRefundStatus,
  getRefundById,
  getSellerRefunds
} from "@/services/refund.service";
import {
  getReturnsQuerySchema,
  returnIdSchema,
  updateReturnStatusSchema,
  processRefundSchema,
  updateRefundStatusSchema,
  refundIdSchema
} from "@/schemas/return.schema";

/**
 * Get seller returns
 * GET /api/seller/returns
 */
export const getSellerReturnsList = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { status, page, limit } = getReturnsQuerySchema.parse(req.query);
  const result = await getSellerReturns(sellerId, status, page, limit);

  res.status(200).json(new ApiResponse(200, { data: result }, "Returns fetched successfully"));
});

/**
 * Get return by ID (seller)
 * GET /api/seller/returns/:returnId
 */
export const getSellerReturnById = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { returnId } = returnIdSchema.parse(req.params);
  const returnData = await getReturnById(returnId, sellerId, "seller");

  res.status(200).json(new ApiResponse(200, { data: returnData }, "Return fetched successfully"));
});

/**
 * Update return status (seller)
 * PUT /api/seller/returns/:returnId/status
 */
export const updateSellerReturnStatus = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { returnId } = returnIdSchema.parse(req.params);
  const data = updateReturnStatusSchema.parse(req.body);

  const returnData = await updateReturnStatus(returnId, sellerId, data);

  res
    .status(200)
    .json(new ApiResponse(200, { data: returnData }, "Return status updated successfully"));
});

/**
 * Process refund for a return (seller)
 * POST /api/seller/refunds
 */
export const processReturnRefund = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const data = processRefundSchema.parse(req.body);
  const refund = await processRefund(sellerId, data);

  res.status(201).json(new ApiResponse(201, { data: refund }, "Refund created successfully"));
});

/**
 * Update refund status (seller)
 * PUT /api/seller/refunds/:refundId/status
 */
export const updateSellerRefundStatus = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { refundId } = refundIdSchema.parse(req.params);
  const data = updateRefundStatusSchema.parse(req.body);

  const refund = await updateRefundStatus(refundId, sellerId, data);

  res.status(200).json(new ApiResponse(200, { data: refund }, "Refund status updated successfully"));
});

/**
 * Get refund by ID (seller)
 * GET /api/seller/refunds/:refundId
 */
export const getSellerRefundById = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { refundId } = refundIdSchema.parse(req.params);
  const refund = await getRefundById(refundId, sellerId, "seller");

  res.status(200).json(new ApiResponse(200, { data: refund }, "Refund fetched successfully"));
});

/**
 * Get all seller refunds
 * GET /api/seller/refunds
 */
export const getSellerRefundsList = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { status, page, limit } = getReturnsQuerySchema.parse(req.query);
  const result = await getSellerRefunds(sellerId, status, page, limit);

  res.status(200).json(new ApiResponse(200, { data: result }, "Refunds fetched successfully"));
});
