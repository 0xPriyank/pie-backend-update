import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import {
  createReturn,
  getCustomerReturns,
  getReturnById,
  cancelReturn
} from "@/services/return.service";
import {
  createReturnSchema,
  getReturnsQuerySchema,
  returnIdSchema
} from "@/schemas/return.schema";

/**
 * Create a return request
 * POST /api/returns
 */
export const createReturnRequest = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const data = createReturnSchema.parse(req.body);
  const returnData = await createReturn(customerId, data);

  res
    .status(201)
    .json(new ApiResponse(201, { data: returnData }, "Return request created successfully"));
});

/**
 * Get customer returns
 * GET /api/returns
 */
export const getMyReturns = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { status, page, limit } = getReturnsQuerySchema.parse(req.query);
  const result = await getCustomerReturns(customerId, status, page, limit);

  res.status(200).json(new ApiResponse(200, { data: result }, "Returns fetched successfully"));
});

/**
 * Get return by ID (customer)
 * GET /api/returns/:returnId
 */
export const getMyReturnById = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { returnId } = returnIdSchema.parse(req.params);
  const returnData = await getReturnById(returnId, customerId, "customer");

  res.status(200).json(new ApiResponse(200, { data: returnData }, "Return fetched successfully"));
});

/**
 * Cancel return request (customer)
 * POST /api/returns/:returnId/cancel
 */
export const cancelMyReturn = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { returnId } = returnIdSchema.parse(req.params);
  const returnData = await cancelReturn(returnId, customerId);

  res.status(200).json(new ApiResponse(200, { data: returnData }, "Return cancelled successfully"));
});
