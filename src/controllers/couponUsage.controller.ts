import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { baseCouponUsageSchema } from "@/schemas/couponUsage.schema";
import { createCouponUsage } from "@/services/couponUsage.service";

export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.user?.id;
  if (!customerId) {
    throw new ApiError(401, "Unauthorized");
  }

  const validationResult = baseCouponUsageSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ApiError(400, "Invalid data provided", validationResult.error.errors as never);
  }

  const { couponCode, orderId } = validationResult.data;
  const usageRecord = await createCouponUsage(customerId, couponCode, orderId);
  res.status(200).json({ message: "Coupon used successfully", usageRecord: usageRecord });
});
