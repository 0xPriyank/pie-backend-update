import { z } from "zod";

/**
 * Schema for creating a return request
 */
export const createReturnSchema = z.object({
  subOrderId: z.string().uuid("Invalid sub-order ID"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        subOrderItemId: z.string().uuid("Invalid item ID"),
        quantity: z.number().int().positive("Quantity must be positive"),
        refundAmount: z.number().positive("Refund amount must be positive")
      })
    )
    .min(1, "At least one item is required"),
  pickupAddress: z.string().optional()
});

/**
 * Schema for updating return status (seller)
 */
export const updateReturnStatusSchema = z.object({
  status: z.enum([
    "APPROVED",
    "REJECTED",
    "PICKED_UP",
    "IN_TRANSIT",
    "RECEIVED",
    "INSPECTED",
    "COMPLETED",
    "CANCELLED"
  ]),
  rejectionReason: z.string().optional(),
  trackingNumber: z.string().optional()
});

/**
 * Schema for processing refund
 */
export const processRefundSchema = z.object({
  returnId: z.string().uuid("Invalid return ID"),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum([
    "ORIGINAL_PAYMENT_METHOD",
    "WALLET",
    "BANK_TRANSFER",
    "STORE_CREDIT"
  ]).default("ORIGINAL_PAYMENT_METHOD"),
  transactionId: z.string().optional()
});

/**
 * Schema for updating refund status
 */
export const updateRefundStatusSchema = z.object({
  status: z.enum(["INITIATED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  transactionId: z.string().optional(),
  failureReason: z.string().optional()
});

/**
 * Schema for getting returns with filters
 */
export const getReturnsQuerySchema = z.object({
  status: z
    .enum([
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "PICKED_UP",
      "IN_TRANSIT",
      "RECEIVED",
      "INSPECTED",
      "COMPLETED",
      "CANCELLED"
    ])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

/**
 * Schema for return ID param
 */
export const returnIdSchema = z.object({
  returnId: z.string().uuid("Invalid return ID")
});

/**
 * Schema for refund ID param
 */
export const refundIdSchema = z.object({
  refundId: z.string().uuid("Invalid refund ID")
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type UpdateReturnStatusInput = z.infer<typeof updateReturnStatusSchema>;
export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
export type UpdateRefundStatusInput = z.infer<typeof updateRefundStatusSchema>;
export type GetReturnsQuery = z.infer<typeof getReturnsQuerySchema>;
