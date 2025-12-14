import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid({ message: "Invalid order ID" }),
  paymentMethod: z.enum(["RAZORPAY", "CASH_ON_DELIVERY", "BANK_TRANSFER", "UPI", "CARD"]).optional()
});

export const capturePaymentSchema = z.object({
  paymentAttemptId: z.string().uuid({ message: "Invalid payment attempt ID" })
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay signature is required"),
  orderId: z.string().uuid({ message: "Invalid order ID" })
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
