import { Router } from "express";
import { verifyJWT } from "@/modules/auth/auth";
import { validate } from "@/middlewares/validation.middleware";
import {
  getAllSellerOrders,
  getSellerOrder,
  updateSellerOrderStatus,
  deleteSellerOrder,
  getSellerOrderStats,
  getSellerRecentOrders,
  getSellerOrdersByStatus,
  getSellerOrdersWithPayments
} from "@/controllers/seller/order.controller";
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

// Schema for order ID
const orderIdSchema = z.object({
  orderId: z.string().uuid()
});

// Schema for order status parameter
const orderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});

const router = Router();

// Apply seller authentication middleware to all routes
router.use(verifyJWT("seller"));

/**
 * Order Operations
 */

// Get all orders for the seller with pagination and filtering
router.get(
  "/all",
  validate(paginationSchema, "query"),
  validate(orderFiltersSchema, "query"),
  getAllSellerOrders
);

// Get order statistics
router.get("/stats", getSellerOrderStats);

// Get recent orders
router.get("/recent", getSellerRecentOrders);

// Get orders by status
router.get(
  "/status/:status",
  validate(orderStatusSchema, "params"),
  validate(paginationSchema, "query"),
  getSellerOrdersByStatus
);

// Get orders with payments
router.get("/with-payments", validate(paginationSchema, "query"), getSellerOrdersWithPayments);

// Get a specific order by ID
router.get("/:orderId", validate(orderIdSchema, "params"), getSellerOrder);

// Update order status
router.patch(
  "/:orderId/status",
  validate(orderIdSchema, "params"),
  validate(updateOrderStatusSchema, "body"),
  updateSellerOrderStatus
);

// Delete an order
router.delete("/:orderId", validate(orderIdSchema, "params"), deleteSellerOrder);

export default router;
