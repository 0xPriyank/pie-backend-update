import { z } from "zod";

export const baseCouponUsageSchema = z.object({
  couponCode: z.string().trim().min(1, "Coupon code is required."),
  orderId: z.string().uuid("Invalid order ID.")
});
