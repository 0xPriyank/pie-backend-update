import { Request, Response } from "express";
import crypto from "crypto";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import {
  razorpayWebhookSchema,
  cashfreeWebhookSchema,
  type RazorpayWebhookPayload,
  type CashfreeWebhookPayload,
} from "@/schemas/webhook.schema";
import {
  updateOrderStatusOnPaymentSuccess,
  updateOrderStatusOnPaymentFailure,
  processPaymentRefund,
} from "@/services/payment.service";

/**
 * ====================================================================
 * Phase 5: Payment Webhook Controllers
 * ====================================================================
 * Handles webhooks from Razorpay and Cashfree payment gateways
 */

/**
 * ----CTP: Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 * 
 * Handles payment events from Razorpay:
 * - payment.authorized
 * - payment.captured
 * - payment.failed
 * - refund.created
 * - refund.processed
 */
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    // 1. Verify Razorpay signature
    const signature = req.headers["x-razorpay-signature"] as string;
    
    if (!signature) {
      console.error("❌ Razorpay webhook: Missing signature");
      return res.status(400).json({
        success: false,
        message: "Missing signature",
      });
    }

    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("❌ Razorpay webhook secret not configured");
      return res.status(500).json({
        success: false,
        message: "Webhook configuration error",
      });
    }

    // Verify signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Razorpay webhook: Invalid signature");
      return res.status(401).json({
        success: false,
        message: "Invalid signature",
      });
    }

    console.log("✅ Razorpay webhook signature verified");

    // 2. Validate webhook payload
    const validation = razorpayWebhookSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.error("❌ Razorpay webhook: Invalid payload format", validation.error);
      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload",
        errors: validation.error.errors,
      });
    }

    const payload: RazorpayWebhookPayload = validation.data;
    const event = payload.event;
    const payment = payload.payload.payment.entity;

    console.log(`📥 Razorpay webhook received: ${event} - Payment ID: ${payment.id}`);

    // 3. Handle different webhook events
    switch (event) {
      case "payment.captured":
      case "payment.authorized":
        // Payment successful
        await updateOrderStatusOnPaymentSuccess({
          paymentId: payment.id,
          orderId: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          gatewayOrderId: payment.order_id,
          gatewayPaymentId: payment.id,
          paidAt: new Date(payment.created_at * 1000),
        });

        console.log(`✅ Payment ${payment.id} captured successfully`);
        break;

      case "payment.failed":
        // Payment failed
        await updateOrderStatusOnPaymentFailure({
          paymentId: payment.id,
          orderId: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          gatewayOrderId: payment.order_id,
          gatewayPaymentId: payment.id,
          errorCode: payment.error_code || undefined,
          errorDescription: payment.error_description || undefined,
        });

        console.log(`❌ Payment ${payment.id} failed: ${payment.error_description}`);
        break;

      case "refund.created":
      case "refund.processed":
        // Refund processed
        await processPaymentRefund(
          payment.id,
          payment.order_id,
          payment.amount_refunded,
          "Refund initiated by gateway"
        );

        console.log(`💰 Refund ${payment.id} processed successfully`);
        break;

      default:
        console.log(`ℹ️ Unhandled Razorpay event: ${event}`);
    }

    // 4. Always return 200 to acknowledge receipt
    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error: any) {
    console.error("❌ Razorpay webhook error:", error);
    
    // Still return 200 to avoid retries for unrecoverable errors
    // Log the error for manual investigation
    return res.status(200).json({
      success: false,
      message: "Webhook received but processing failed",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Cashfree Webhook Handler
 * POST /api/webhooks/cashfree
 * 
 * Handles payment events from Cashfree:
 * - SUCCESS
 * - FAILED
 * - CANCELLED
 * - USER_DROPPED
 */
export const handleCashfreeWebhook = async (req: Request, res: Response) => {
  try {
    // 1. Verify Cashfree signature
    const signature = req.headers["x-webhook-signature"] as string;
    const timestamp = req.headers["x-webhook-timestamp"] as string;

    if (!signature || !timestamp) {
      console.error("❌ Cashfree webhook: Missing signature or timestamp");
      return res.status(400).json({
        success: false,
        message: "Missing signature or timestamp",
      });
    }

    const webhookSecret = env.CASHFREE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ Cashfree webhook secret not configured");
      return res.status(500).json({
        success: false,
        message: "Webhook configuration error",
      });
    }

    // Verify signature
    const body = JSON.stringify(req.body);
    const signatureData = `${timestamp}${body}`;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signatureData)
      .digest("base64");

    if (signature !== expectedSignature) {
      console.error("❌ Cashfree webhook: Invalid signature");
      return res.status(401).json({
        success: false,
        message: "Invalid signature",
      });
    }

    console.log("✅ Cashfree webhook signature verified");

    // 2. Validate webhook payload
    const validation = cashfreeWebhookSchema.safeParse(req.body);

    if (!validation.success) {
      console.error("❌ Cashfree webhook: Invalid payload format", validation.error);
      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload",
        errors: validation.error.errors,
      });
    }

    const payload: CashfreeWebhookPayload = validation.data;
    const eventType = payload.type;
    const { order, payment } = payload.data;

    console.log(`📥 Cashfree webhook received: ${eventType} - Order ID: ${order.order_id}`);

    // 3. Handle different payment statuses
    switch (payment.payment_status) {
      case "SUCCESS":
        // Payment successful
        await updateOrderStatusOnPaymentSuccess({
          paymentId: payment.cf_payment_id,
          orderId: order.order_id,
          amount: payment.payment_amount * 100, // Convert to paisa
          currency: payment.payment_currency,
          status: "captured",
          method: payment.payment_group || "unknown",
          gatewayOrderId: order.order_id,
          gatewayPaymentId: payment.cf_payment_id,
          paidAt: new Date(payment.payment_time),
        });

        console.log(`✅ Cashfree payment ${payment.cf_payment_id} succeeded`);
        break;

      case "FAILED":
      case "CANCELLED":
      case "USER_DROPPED":
        // Payment failed
        await updateOrderStatusOnPaymentFailure({
          paymentId: payment.cf_payment_id,
          orderId: order.order_id,
          amount: payment.payment_amount * 100,
          currency: payment.payment_currency,
          status: "failed",
          method: payment.payment_group || "unknown",
          gatewayOrderId: order.order_id,
          gatewayPaymentId: payment.cf_payment_id,
          errorCode: payload.data.error_details?.error_code,
          errorDescription:
            payload.data.error_details?.error_description ||
            payment.payment_message ||
            undefined,
        });

        console.log(
          `❌ Cashfree payment ${payment.cf_payment_id} failed: ${payment.payment_message}`
        );
        break;

      default:
        console.log(`ℹ️ Unhandled Cashfree payment status: ${payment.payment_status}`);
    }

    // 4. Always return 200 to acknowledge receipt
    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error: any) {
    console.error("❌ Cashfree webhook error:", error);

    // Still return 200 to avoid retries for unrecoverable errors
    return res.status(200).json({
      success: false,
      message: "Webhook received but processing failed",
      error: error.message,
    });
  }
};

/**
 * ----CTP: Test Webhook Endpoint (Development only)
 * POST /api/webhooks/test
 */
export const handleTestWebhook = async (req: Request, res: Response) => {
  try {
    if (env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Test webhook not available in production",
      });
    }

    console.log("🧪 Test webhook received:", req.body);

    return res.status(200).json(
      new ApiResponse(200, { received: req.body }, "Test webhook received successfully")
    );
  } catch (error: any) {
    console.error("❌ Test webhook error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
