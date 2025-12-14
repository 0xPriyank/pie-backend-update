import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import {
  getSellerOrders,
  getSellerOrderById,
  updateOrderStatus,
  deleteOrder,
  getSellerOrderStats as getSellerOrderStatsService,
  getSellerRecentOrders as getSellerRecentOrdersService
} from "@/services/seller/order.service";
import { paginationSchema } from "@/schemas/product.schema";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";

// Schema for order status update
const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  deliveredToCourierAt: z.string().datetime().optional(),
  beingDelivered: z.string().datetime().optional(),
  delivered: z.string().datetime().optional(),
  canceledAt: z.string().datetime().optional(),
  orderNotes: z.string().optional()
});

// Schema for order filters
const orderFiltersSchema = z.object({
  orderStatus: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z
    .enum([
      "NOT_PAID",
      "PENDING",
      "SUCCESS",
      "ABANDONED",
      "FAILED",
      "REFUNDED",
      "PARTIALLY_REFUNDED"
    ])
    .optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

/**
 * Get all orders for the logged-in seller with pagination and filtering
 * GET /seller/order/all
 */
export const getAllSellerOrders = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { page, limit } = paginationSchema.parse(req.query);
  const filters = orderFiltersSchema.parse(req.query);

  // Convert date strings to Date objects if provided
  const processedFilters = {
    ...filters,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined
  };

  const result = await getSellerOrders(sellerId, page, limit, processedFilters);

  res.status(200).json(new ApiResponse(200, { data: result }, "Orders fetched successfully"));
});

/**
 * Get a specific order by ID for the logged-in seller
 * GET /seller/order/:orderId
 */
export const getSellerOrder = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { orderId } = req.params as { orderId: string };

  const order = await getSellerOrderById(orderId, sellerId);

  res.status(200).json(new ApiResponse(200, { data: order }, "Order fetched successfully"));
});

/**
 * Update order status for the logged-in seller
 * PATCH /seller/order/:orderId/status
 */
export const updateSellerOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { orderId } = req.params as { orderId: string };
  const updateData = updateOrderStatusSchema.parse(req.body);

  // Convert date strings to Date objects if provided
  const processedData = {
    ...updateData,
    deliveredToCourierAt: updateData.deliveredToCourierAt
      ? new Date(updateData.deliveredToCourierAt)
      : undefined,
    beingDelivered: updateData.beingDelivered ? new Date(updateData.beingDelivered) : undefined,
    delivered: updateData.delivered ? new Date(updateData.delivered) : undefined,
    canceledAt: updateData.canceledAt ? new Date(updateData.canceledAt) : undefined
  };

  const updatedOrder = await updateOrderStatus(orderId, sellerId, updateData.status, processedData);

  res
    .status(200)
    .json(new ApiResponse(200, { data: updatedOrder }, "Order status updated successfully"));
});

/**
 * Delete an order for the logged-in seller
 * DELETE /seller/order/:orderId
 */
export const deleteSellerOrder = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { orderId } = req.params as { orderId: string };

  const result = await deleteOrder(orderId, sellerId);

  res.status(200).json(new ApiResponse(200, { data: result }, "Order deleted successfully"));
});

/**
 * Get order statistics for the logged-in seller
 * GET /seller/order/stats
 */
export const getSellerOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

  const dateRange =
    dateFrom && dateTo
      ? {
          from: new Date(dateFrom),
          to: new Date(dateTo)
        }
      : undefined;

  const stats = await getSellerOrderStatsService(sellerId, dateRange);

  res
    .status(200)
    .json(new ApiResponse(200, { data: stats }, "Order statistics fetched successfully"));
});

/**
 * Get recent orders for the logged-in seller
 * GET /seller/order/recent
 */
export const getSellerRecentOrders = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { limit } = req.query as { limit?: string };
  const limitNumber = limit ? parseInt(limit) : 5;

  const orders = await getSellerRecentOrdersService(sellerId, limitNumber);

  res
    .status(200)
    .json(new ApiResponse(200, { data: orders }, "Recent orders fetched successfully"));
});

/**
 * Get orders by status for the logged-in seller
 * GET /seller/order/status/:status
 */
export const getSellerOrdersByStatus = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { status } = req.params as { status: string };
  const { page, limit } = paginationSchema.parse(req.query);

  // Validate status
  if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
    throw new ApiError(400, "Invalid order status");
  }

  const result = await getSellerOrders(sellerId, page, limit, {
    orderStatus: status as OrderStatus
  });

  res.status(200).json(new ApiResponse(200, { data: result }, "Orders fetched successfully"));
});

/**
 * Get orders with payments for the logged-in seller
 * GET /seller/order/with-payments
 */
export const getSellerOrdersWithPayments = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user?.id;
  if (!sellerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const { page, limit } = paginationSchema.parse(req.query);

  // Get orders that have payment attempts
  const result = await getSellerOrders(sellerId, page, limit, {
    paymentStatus: "SUCCESS"
  });

  res
    .status(200)
    .json(new ApiResponse(200, { data: result }, "Orders with payments fetched successfully"));
});
