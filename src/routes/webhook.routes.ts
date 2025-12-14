import { Router } from "express";
import {
  handleRazorpayWebhook,
  handleCashfreeWebhook,
  handleTestWebhook,
} from "@/controllers/webhook.controller";

/**
 * ====================================================================
 * Phase 5: Payment Webhook Routes
 * ====================================================================
 * Public routes for payment gateway webhooks (no authentication)
 * Note: These routes receive raw body for signature verification
 */

const router = Router();

/**
 * Razorpay Webhook
 * POST /api/webhooks/razorpay
 * 
 * Events handled:
 * - payment.authorized
 * - payment.captured
 * - payment.failed
 * - refund.created
 * - refund.processed
 */
router.post("/razorpay", handleRazorpayWebhook);

/**
 * Cashfree Webhook
 * POST /api/webhooks/cashfree
 * 
 * Events handled:
 * - SUCCESS
 * - FAILED
 * - CANCELLED
 * - USER_DROPPED
 */
router.post("/cashfree", handleCashfreeWebhook);

/**
 * Test Webhook (Development only)
 * POST /api/webhooks/test
 */
router.post("/test", handleTestWebhook);

export default router;
