import { z } from "zod";

/**
 * ====================================================================
 * Phase 5: Payment Webhook Schemas
 * ====================================================================
 * Validation schemas for Razorpay and Cashfree webhook payloads
 */

// ----CTP: Razorpay Webhook Schemas
export const razorpayWebhookSchema = z.object({
  entity: z.string(),
  account_id: z.string(),
  event: z.string(),
  contains: z.array(z.string()),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        entity: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.enum([
          "created",
          "authorized",
          "captured",
          "refunded",
          "failed",
        ]),
        order_id: z.string(),
        invoice_id: z.string().nullable().optional(),
        international: z.boolean(),
        method: z.string(),
        amount_refunded: z.number(),
        refund_status: z.string().nullable().optional(),
        captured: z.boolean(),
        description: z.string().nullable().optional(),
        card_id: z.string().nullable().optional(),
        bank: z.string().nullable().optional(),
        wallet: z.string().nullable().optional(),
        vpa: z.string().nullable().optional(),
        email: z.string().email(),
        contact: z.string(),
        notes: z.record(z.any()).optional(),
        fee: z.number().optional(),
        tax: z.number().optional(),
        error_code: z.string().nullable().optional(),
        error_description: z.string().nullable().optional(),
        error_source: z.string().nullable().optional(),
        error_step: z.string().nullable().optional(),
        error_reason: z.string().nullable().optional(),
        acquirer_data: z.record(z.any()).optional(),
        created_at: z.number(),
      }),
    }),
  }),
  created_at: z.number(),
});

// ----CTP: Cashfree Webhook Schemas
export const cashfreeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    order: z.object({
      order_id: z.string(),
      order_amount: z.number(),
      order_currency: z.string(),
      order_tags: z.record(z.any()).nullable().optional(),
    }),
    payment: z.object({
      cf_payment_id: z.string(),
      payment_status: z.enum([
        "SUCCESS",
        "NOT_ATTEMPTED",
        "FAILED",
        "USER_DROPPED",
        "VOID",
        "CANCELLED",
        "PENDING",
      ]),
      payment_amount: z.number(),
      payment_currency: z.string(),
      payment_message: z.string().nullable().optional(),
      payment_time: z.string(),
      bank_reference: z.string().nullable().optional(),
      auth_id: z.string().nullable().optional(),
      payment_method: z
        .object({
          card: z
            .object({
              channel: z.string().optional(),
              card_number: z.string().optional(),
              card_network: z.string().optional(),
              card_type: z.string().optional(),
              card_country: z.string().optional(),
              card_bank_name: z.string().optional(),
            })
            .nullable()
            .optional(),
          upi: z
            .object({
              channel: z.string().optional(),
              upi_id: z.string().optional(),
            })
            .nullable()
            .optional(),
          netbanking: z
            .object({
              channel: z.string().optional(),
              netbanking_bank_name: z.string().optional(),
            })
            .nullable()
            .optional(),
          wallet: z
            .object({
              channel: z.string().optional(),
              wallet_name: z.string().optional(),
            })
            .nullable()
            .optional(),
        })
        .optional(),
      payment_group: z.string().optional(),
    }),
    customer_details: z.object({
      customer_name: z.string().nullable().optional(),
      customer_id: z.string().nullable().optional(),
      customer_email: z.string().email().nullable().optional(),
      customer_phone: z.string().nullable().optional(),
    }),
    error_details: z
      .object({
        error_code: z.string().optional(),
        error_description: z.string().optional(),
        error_reason: z.string().optional(),
        error_source: z.string().optional(),
      })
      .nullable()
      .optional(),
  }),
});

export const verifyRazorpaySignatureSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const verifyCashfreeSignatureSchema = z.object({
  timestamp: z.string(),
  signature: z.string(),
});

// Type exports
export type RazorpayWebhookPayload = z.infer<typeof razorpayWebhookSchema>;
export type CashfreeWebhookPayload = z.infer<typeof cashfreeWebhookSchema>;
export type VerifyRazorpaySignature = z.infer<typeof verifyRazorpaySignatureSchema>;
export type VerifyCashfreeSignature = z.infer<typeof verifyCashfreeSignatureSchema>;
